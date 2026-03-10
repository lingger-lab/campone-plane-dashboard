import openai from '@/lib/openai/client';
import { isOpenAIConfigured } from '@/lib/openai/client';
import { reportUsage } from '@/lib/usage-reporter';
import type { RetrievedSource } from './retriever';

const RAG_MODEL = process.env.RAG_MODEL || 'gpt-4o-mini';

export class RAGGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: 'NO_API_KEY' | 'LLM_FAILED' | 'EMPTY_RESPONSE',
  ) {
    super(message);
    this.name = 'RAGGenerationError';
  }
}

export interface GenerateAnswerParams {
  tenantId?: string;
  questionText: string;
  sources: RetrievedSource[];
  phase?: 'quick' | 'detailed';
}

export async function generateAnswer(params: GenerateAnswerParams): Promise<string> {
  const phase = params.phase || 'detailed';

  if (!isOpenAIConfigured()) {
    throw new RAGGenerationError('OpenAI API 키가 설정되지 않았습니다.', 'NO_API_KEY');
  }

  const prompt =
    phase === 'quick'
      ? buildQuickPrompt(params.questionText, params.sources)
      : buildDetailedPrompt(params.questionText, params.sources);

  const maxTokens = phase === 'quick' ? 300 : 1500;
  const startTime = Date.now();

  const response = await openai.chat.completions.create({
    model: RAG_MODEL,
    messages: [
      { role: 'system', content: getSystemPrompt(phase) },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
    max_tokens: maxTokens,
  });

  // 사용량 보고
  if (params.tenantId && response.usage) {
    reportUsage({
      tenantId: params.tenantId,
      feature: phase === 'quick' ? 'help_quick' : 'help_detailed',
      model: RAG_MODEL,
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
      latencyMs: Date.now() - startTime,
    });
  }

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new RAGGenerationError('LLM이 빈 응답을 반환했습니다.', 'EMPTY_RESPONSE');
  }

  return content.trim();
}

export async function* generateAnswerStream(
  params: GenerateAnswerParams,
): AsyncGenerator<{ type: 'chunk' | 'done' | 'error'; content?: string; error?: string }> {
  const phase = params.phase || 'detailed';

  if (!isOpenAIConfigured()) {
    yield { type: 'error', error: 'OpenAI API 키가 설정되지 않았습니다.' };
    return;
  }

  try {
    const prompt =
      phase === 'quick'
        ? buildQuickPrompt(params.questionText, params.sources)
        : buildDetailedPrompt(params.questionText, params.sources);

    const maxTokens = phase === 'quick' ? 300 : 1500;
    const startTime = Date.now();

    const stream = await openai.chat.completions.create({
      model: RAG_MODEL,
      messages: [
        { role: 'system', content: getSystemPrompt(phase) },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    });

    let streamUsage: { prompt_tokens?: number; completion_tokens?: number } | null = null;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield { type: 'chunk', content };
      }
      if (chunk.usage) {
        streamUsage = chunk.usage;
      }
    }

    // 사용량 보고
    if (params.tenantId && streamUsage) {
      reportUsage({
        tenantId: params.tenantId,
        feature: phase === 'quick' ? 'help_quick' : 'help_detailed',
        model: RAG_MODEL,
        inputTokens: streamUsage.prompt_tokens || 0,
        outputTokens: streamUsage.completion_tokens || 0,
        latencyMs: Date.now() - startTime,
      });
    }

    yield { type: 'done' };
  } catch {
    yield { type: 'error', error: 'LLM 응답 생성에 실패했습니다.' };
  }
}

/**
 * raw 코사인 유사도 (보통 0.1~0.5) -> 직관적 퍼센트 (60~95%)
 */
export function scaleRelevanceScore(rawScore: number): number {
  const MIN_RAW = 0.1,
    MAX_RAW = 0.5;
  const MIN_SCALED = 60,
    MAX_SCALED = 95;

  const clamped = Math.max(MIN_RAW, Math.min(MAX_RAW, rawScore));
  const scaled =
    MIN_SCALED + ((clamped - MIN_RAW) / (MAX_RAW - MIN_RAW)) * (MAX_SCALED - MIN_SCALED);

  return Math.round(scaled);
}

function buildQuickPrompt(questionText: string, sources: RetrievedSource[]): string {
  const context = sources
    .slice(0, 3)
    .map((s, i) => `[출처 ${i + 1}] ${s.documentName}\n${s.excerpt?.substring(0, 300) || ''}`)
    .join('\n\n');

  return `# 질문\n${questionText}\n\n# 참고 문서\n${context}\n\n위 문서만을 바탕으로 질문에 3-5문장으로 답변해주세요.\n문서에 없는 내용은 추측하지 마세요.\n자세한 내용은 "자세히 보기" 버튼을 통해 확인하라고 안내해주세요.`;
}

function buildDetailedPrompt(questionText: string, sources: RetrievedSource[]): string {
  const context = sources
    .map((s, i) => `[출처 ${i + 1}] ${s.documentName} (${s.documentDate})\n${s.excerpt}`)
    .join('\n\n');

  return `# 질문
${questionText}

# 참고 문서
${context}

위 문서만을 바탕으로 답변해주세요. 문서에 없는 기능이나 절차를 추측하지 마세요.

# 답변 형식
## 답변
(질문에 대한 직접적인 답변을 2~3문장으로)

## 사용 방법
1. **[단계/메뉴명]**: 구체적인 조작 방법
2. **[단계/메뉴명]**: 구체적인 조작 방법

## 관련 질문
(추가로 참고할 만한 질문 1-2개 제시)`;
}

function getSystemPrompt(phase: 'quick' | 'detailed'): string {
  const baseContext = `당신은 CampOne 관리자 대시보드의 도움말 챗봇입니다.

CampOne은 선거 캠프 관리 플랫폼으로, 5개 핵심 모듈이 있습니다:
- Insights (여론 분석): 실시간 여론 트렌드, 감성 분석, 리스크 감지
- Studio (콘텐츠): 카드뉴스, 배너 제작 및 배포
- Policy Lab (정책): 공약 관리, 전략 분석
- Ops (운영): 일정, 체크리스트, 업무 관리
- Civic Hub (시민 소통): 시민 질문 응대, 메시지 발송

대시보드는 이 모듈들을 통합 관리하며, KPI 지표, 활동 로그, 알림을 제공합니다.`;

  if (phase === 'quick') {
    return `${baseContext}

[규칙]
- 제공된 문서에 있는 내용만 답변하세요
- 문서에 없는 기능이나 절차를 만들어내지 마세요
- 3-5문장으로 핵심만 전달하세요
- 마지막에 "더 자세한 내용이 궁금하시면 아래 '자세히 보기' 버튼을 눌러주세요."라고 안내하세요
- CampOne과 무관한 질문에는 "대시보드 사용과 관련된 질문에 답변드립니다."라고 안내하세요`;
  }

  return `${baseContext}

[규칙]
- 제공된 문서에 있는 내용만 답변하세요
- 문서에 없는 기능이나 절차를 만들어내지 마세요. 모르면 "해당 내용은 확인된 문서에 포함되어 있지 않습니다."라고 답하세요
- 구체적인 메뉴 경로나 버튼 이름을 포함하여 단계별로 안내하세요
- 친근하되 정확한 어조를 유지하세요
- CampOne과 무관한 질문에는 "대시보드 사용과 관련된 질문에 답변드립니다."라고 안내하세요`;
}
