import type { PrismaClient } from '@prisma/client';
import openai from '@/lib/openai/client';
import { isOpenAIConfigured } from '@/lib/openai/client';
import { reportUsage } from '@/lib/usage-reporter';

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
const MAX_EMBEDDING_GENERATIONS_PER_REQUEST = 5;

export class RAGRetrievalError extends Error {
  constructor(
    message: string,
    public readonly code: 'NO_DOCUMENTS' | 'NO_API_KEY' | 'SEARCH_FAILED',
  ) {
    super(message);
    this.name = 'RAGRetrievalError';
  }
}

export interface RetrievedSource {
  documentName: string;
  documentDate: string;
  excerpt?: string;
  relevanceScore: number;
}

export async function retrieveRelevantSources(
  db: PrismaClient,
  questionText: string,
  topK: number = 5,
  tenantId?: string,
): Promise<RetrievedSource[]> {
  const count = await db.helpDocument.count({ where: { isActive: true } });
  if (count === 0) {
    throw new RAGRetrievalError('등록된 문서가 없습니다.', 'NO_DOCUMENTS');
  }

  if (!isOpenAIConfigured()) {
    throw new RAGRetrievalError('OpenAI API 키가 설정되지 않았습니다.', 'NO_API_KEY');
  }

  try {
    return await searchByEmbedding(db, questionText, topK, tenantId);
  } catch {
    try {
      return await searchByKeyword(db, questionText, topK);
    } catch {
      throw new RAGRetrievalError('문서 검색에 실패했습니다.', 'SEARCH_FAILED');
    }
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

async function searchByEmbedding(
  db: PrismaClient,
  questionText: string,
  topK: number,
  tenantId?: string,
): Promise<RetrievedSource[]> {
  const startTime = Date.now();
  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: questionText,
  });
  const questionEmbedding = embeddingResponse.data[0].embedding;

  // 질문 임베딩 사용량 보고
  if (tenantId && embeddingResponse.usage) {
    reportUsage({
      tenantId,
      feature: 'help_embedding',
      model: EMBEDDING_MODEL,
      inputTokens: embeddingResponse.usage.prompt_tokens,
      outputTokens: 0,
      latencyMs: Date.now() - startTime,
    });
  }

  const documents = await db.helpDocument.findMany({
    where: { isActive: true },
    take: 100,
  });

  const docsWithScores: { document: (typeof documents)[0]; score: number }[] = [];
  let embeddingGenCount = 0;

  for (const doc of documents) {
    const savedEmbedding = doc.embedding as number[];

    if (!savedEmbedding || savedEmbedding.length === 0) {
      if (embeddingGenCount >= MAX_EMBEDDING_GENERATIONS_PER_REQUEST) continue;

      try {
        embeddingGenCount++;
        const resp = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: doc.content.substring(0, 8000),
        });
        const newEmbedding = resp.data[0].embedding;

        await db.helpDocument.update({
          where: { id: doc.id },
          data: { embedding: newEmbedding },
        });

        docsWithScores.push({
          document: doc,
          score: cosineSimilarity(questionEmbedding, newEmbedding),
        });
      } catch {
        continue;
      }
    } else {
      docsWithScores.push({
        document: doc,
        score: cosineSimilarity(questionEmbedding, savedEmbedding),
      });
    }
  }

  const topDocs = docsWithScores.sort((a, b) => b.score - a.score).slice(0, topK);

  return topDocs.map((item) => ({
    documentName: item.document.title,
    documentDate: item.document.createdAt.toISOString().split('T')[0],
    excerpt: item.document.content.substring(0, 500),
    relevanceScore: item.score,
  }));
}

async function searchByKeyword(
  db: PrismaClient,
  questionText: string,
  topK: number,
): Promise<RetrievedSource[]> {
  const keywords = questionText
    .split(/\s+/)
    .filter((word) => word.length > 1)
    .slice(0, 5);

  if (keywords.length === 0) {
    throw new RAGRetrievalError('검색어를 추출할 수 없습니다.', 'SEARCH_FAILED');
  }

  const documents = await db.helpDocument.findMany({
    where: {
      isActive: true,
      OR: keywords.map((keyword) => ({
        content: { contains: keyword, mode: 'insensitive' as const },
      })),
    },
    take: topK,
    orderBy: { createdAt: 'desc' },
  });

  return documents.map((doc, idx) => ({
    documentName: doc.title,
    documentDate: doc.createdAt.toISOString().split('T')[0],
    excerpt: doc.content.substring(0, 500),
    relevanceScore: 0.5 - idx * 0.05,
  }));
}
