/**
 * Control에 에러/경고를 보고하는 유틸리티 (fire-and-forget)
 *
 * 사용 예:
 *   reportError({
 *     service: 'dashboard',
 *     tenantId: 'camp-dev',
 *     level: 'error',
 *     message: 'LLM API 호출 실패',
 *     meta: { endpoint: '/api/analysis', statusCode: 500 },
 *   });
 */

const CONTROL_URL = process.env.CONTROL_URL;
const SERVICE_API_KEY = process.env.SERVICE_API_KEY;

interface ErrorReport {
  service: string;
  tenantId?: string;
  level?: 'error' | 'warn';
  message: string;
  stack?: string;
  meta?: Record<string, unknown>;
}

/**
 * 에러를 Control에 보고 (fire-and-forget)
 * 실패해도 서비스 동작에 영향을 주지 않습니다.
 */
export function reportError(report: ErrorReport): void {
  if (!CONTROL_URL || !SERVICE_API_KEY) return;

  fetch(`${CONTROL_URL}/api/monitoring/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_API_KEY}`,
    },
    body: JSON.stringify(report),
  }).catch(() => {});
}

/**
 * 배치 보고 (버퍼에 모았다가 한 번에 전송)
 */
const buffer: ErrorReport[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function reportErrorBatched(report: ErrorReport): void {
  if (!CONTROL_URL || !SERVICE_API_KEY) return;

  buffer.push(report);

  if (buffer.length >= 20) {
    flushErrorBuffer();
    return;
  }

  if (!flushTimer) {
    flushTimer = setTimeout(flushErrorBuffer, 10_000);
  }
}

function flushErrorBuffer(): void {
  if (buffer.length === 0) return;

  const records = buffer.splice(0, 50);
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  fetch(`${CONTROL_URL}/api/monitoring/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_API_KEY}`,
    },
    body: JSON.stringify({ records }),
  }).catch(() => {});
}
