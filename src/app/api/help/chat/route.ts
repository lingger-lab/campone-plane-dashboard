import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSystemPrisma } from '@/lib/prisma';
import { getTenantIdFromRequest } from '@/lib/api/tenant-helper';
import { retrieveRelevantSources } from '@/services/rag/retriever';
import { generateAnswerStream, scaleRelevanceScore } from '@/services/rag/generator';
import { validateQuality } from '@/lib/quality-gate/validator';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(
        `data: ${JSON.stringify({ type: 'error', error: 'Unauthorized' })}\n\n`,
        { status: 401, headers: { 'Content-Type': 'text/event-stream' } },
      );
    }

    const body = await req.json();
    const questionText = sanitizeInput(body.questionText || '');
    const phase = (body.phase as 'quick' | 'detailed') || 'quick';

    if (!questionText || questionText.length > 1000) {
      return new Response(
        `data: ${JSON.stringify({ type: 'error', error: '질문을 입력해주세요 (최대 1000자).' })}\n\n`,
        { status: 400, headers: { 'Content-Type': 'text/event-stream' } },
      );
    }

    let tenantId: string | undefined;
    try {
      tenantId = await getTenantIdFromRequest();
    } catch {
      // tenantId 없어도 동작 가능 (시스템 공유 문서)
    }

    const systemDb = getSystemPrisma();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const sources = await retrieveRelevantSources(systemDb, questionText, 5);

          if (sources.length === 0) {
            sendEvent({ type: 'error', error: '관련 문서를 찾을 수 없습니다.' });
            controller.close();
            return;
          }

          const scaledSources = sources.map((s) => ({
            ...s,
            relevanceScore: scaleRelevanceScore(s.relevanceScore),
          }));
          sendEvent({ type: 'meta', sources: scaledSources, phase });

          let fullContent = '';
          for await (const chunk of generateAnswerStream({
            questionText,
            sources,
            phase,
          })) {
            if (chunk.type === 'chunk' && chunk.content) {
              fullContent += chunk.content;
              sendEvent({ type: 'chunk', content: chunk.content });
            } else if (chunk.type === 'error') {
              sendEvent({ type: 'error', error: chunk.error });
              controller.close();
              return;
            }
          }

          if (phase === 'detailed' && fullContent) {
            const qualityMetrics = {
              top1: sources[0]?.relevanceScore || 0,
              top3avg:
                sources.slice(0, 3).reduce((sum, s) => sum + s.relevanceScore, 0) /
                Math.min(3, sources.length),
            };
            const qualityCheck = validateQuality(qualityMetrics);
            const status = qualityCheck.passed ? 'ANSWERED' : 'PENDING_REVIEW';

            const savedQuestion = await systemDb.helpQuestion.create({
              data: {
                tenantId: tenantId || null,
                text: questionText,
                summary: fullContent,
                status: status as 'ANSWERED' | 'PENDING_REVIEW',
                qualityTop1: qualityMetrics.top1,
                qualityTop3Avg: qualityMetrics.top3avg,
                userId: (session.user as { id?: string }).id || null,
                sources: {
                  create: scaledSources.map((s) => ({
                    documentName: s.documentName,
                    documentDate: s.documentDate,
                    excerpt: s.excerpt || null,
                    relevanceScore: s.relevanceScore,
                  })),
                },
              },
            });

            sendEvent({ type: 'done', questionId: savedQuestion.id, status });
          } else {
            sendEvent({ type: 'done' });
          }

          controller.close();
        } catch (error) {
          const message =
            error instanceof Error && error.message.includes('등록된 문서가 없습니다')
              ? '아직 등록된 도움말 문서가 없습니다. 관리자에게 문의해주세요.'
              : '스트리밍 중 오류가 발생했습니다.';
          sendEvent({ type: 'error', error: message });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', error: '서버 오류가 발생했습니다.' })}\n\n`,
      { status: 500, headers: { 'Content-Type': 'text/event-stream' } },
    );
  }
}

function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim();
}
