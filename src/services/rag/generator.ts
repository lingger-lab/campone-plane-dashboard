import openai from '@/lib/openai/client';
import { isOpenAIConfigured } from '@/lib/openai/client';
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

  const response = await openai.chat.completions.create({
    model: RAG_MODEL,
    messages: [
      { role: 'system', content: getSystemPrompt(phase) },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
    max_tokens: maxTokens,
  });

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

    const stream = await openai.chat.completions.create({
      model: RAG_MODEL,
      messages: [
        { role: 'system', content: getSystemPrompt(phase) },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield { type: 'chunk', content };
      }
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

  return `# 질문\n${questionText}\n\n# 참고 문서\n${context}\n\n위 문서를 바탕으로 질문에 대해 3-5문장으로 간략히 요약 답변해주세요.\n핵심 내용만 포함하고, 자세한 내용은 "자세히 보기" 버튼을 통해 확인하라고 안내해주세요.`;
}

function buildDetailedPrompt(questionText: string, sources: RetrievedSource[]): string {
  const context = sources
    .map((s, i) => `[출처 ${i + 1}] ${s.documentName} (${s.documentDate})\n${s.excerpt}`)
    .join('\n\n');

  return `# 질문
${questionText}

# 참고 문서
${context}

# 답변 형식
## 전체 방향
(주제에 대한 기본 방향을 2~3문장으로 설명)

## 구체적 실행방안
1. **[항목명]**: 내용과 기대효과
2. **[항목명]**: 내용과 기대효과

## 더 알고 싶으신 점
(추가 질문 1-2개 제시)`;
}

function getSystemPrompt(phase: 'quick' | 'detailed'): string {
  if (phase === 'quick') {
    return `당신은 CampOne 대시보드 도움말 전문가입니다.
사용자의 질문에 간결하고 핵심적인 요약 답변을 제공합니다.
3-5문장으로 핵심만 전달하고, 친근한 어조로 작성합니다.
마지막에 "더 자세한 내용이 궁금하시면 아래 '자세히 보기' 버튼을 눌러주세요."라고 안내합니다.`;
  }

  return `당신은 CampOne 대시보드 도움말 전문가입니다.

[핵심 역할]
- 공식 문서를 바탕으로 정확하고 일관된 답변 제공
- 문서에 없는 내용도 기본 방향에 맞게 합리적으로 보완

[어조]
- 친근하고 신뢰감 있는 어조
- 공감과 경청의 자세

[금지 규칙]
- 과도한 단정 표현 금지
- 검증 불가능한 약속 금지`;
}
