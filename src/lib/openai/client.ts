import OpenAI from 'openai';

const globalForOpenAI = globalThis as unknown as {
  openai: OpenAI | undefined;
};

function getApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;

  if (process.env.NODE_ENV === 'production' && !apiKey) {
    console.warn('[OpenAI] OPENAI_API_KEY not configured in production');
  }

  return apiKey || 'sk-build-placeholder';
}

export const openai =
  globalForOpenAI.openai ??
  new OpenAI({
    apiKey: getApiKey(),
  });

if (process.env.NODE_ENV !== 'production') globalForOpenAI.openai = openai;

export function isOpenAIConfigured(): boolean {
  const apiKey = process.env.OPENAI_API_KEY;
  return !!(apiKey && !apiKey.startsWith('sk-build-') && !apiKey.startsWith('sk-placeholder'));
}

export default openai;
