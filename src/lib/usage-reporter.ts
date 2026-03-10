/**
 * Control LLM 사용량 보고 유틸리티
 * fire-and-forget: 실패해도 서비스 동작에 영향 없음
 *
 * 참고: docs/FEATURE_TAGGING_GUIDE.md
 */

const CONTROL_URL = process.env.CONTROL_URL;
const SERVICE_API_KEY = process.env.SERVICE_API_KEY;
const SERVICE_NAME = 'dashboard';

interface UsageReport {
  tenantId: string;
  feature: string;
  provider?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs?: number;
}

export function reportUsage(params: UsageReport): void {
  if (!CONTROL_URL || !SERVICE_API_KEY) return;

  fetch(`${CONTROL_URL}/api/usage/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_API_KEY}`,
    },
    body: JSON.stringify({
      tenantId: params.tenantId,
      service: SERVICE_NAME,
      feature: params.feature,
      provider: params.provider || 'openai',
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      latencyMs: params.latencyMs,
    }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => {});
}
