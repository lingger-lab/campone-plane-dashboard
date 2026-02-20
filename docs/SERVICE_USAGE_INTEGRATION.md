# CampOne Control — 서비스 연동 가이드

각 서비스(Insight, Studio, Ops 등)가 Control에 **LLM 사용량**과 **에러**를 보고하는 방법을 안내합니다.

---

## 1. 개요

```
[서비스] → LLM API 호출 → 응답 수신 → POST /api/usage/report → [Control] → llm_usage 테이블
```

```
[서비스] → 에러/경고 발생 → POST /api/monitoring/report → [Control] → service_errors 테이블
```

- Control이 시스템 DB의 유일한 쓰기 주체
- 서비스는 HTTP POST 한 번만 호출 (fire-and-forget)
- 보고 실패해도 서비스 동작에 영향 없음

---

## 2. 인증

`Authorization: Bearer <SERVICE_API_KEY>` 헤더를 포함해야 합니다.

| 환경 | 키 설정 방식 |
|------|-------------|
| 로컬 개발 | `.env`에 `SERVICE_API_KEY=dev-api-key-change-in-production` |
| 프로덕션 | GCP Secret Manager `campone-usage-report-key` → Cloud Run 환경변수 자동 주입 |

**모든 서비스가 동일한 API key를 공유합니다.** 서비스별로 분리가 필요해지면 추후 확장.

---

## 3. API 스펙

### 엔드포인트

```
POST {CONTROL_URL}/api/usage/report
Content-Type: application/json
Authorization: Bearer {SERVICE_API_KEY}
```

### 단건 전송

```json
{
  "tenantId": "camp-alpha",
  "service": "studio",
  "provider": "openai",
  "model": "gpt-4o",
  "inputTokens": 1500,
  "outputTokens": 800,
  "latencyMs": 2300
}
```

### 배치 전송 (최대 100건)

```json
{
  "records": [
    {
      "tenantId": "camp-alpha",
      "service": "insight",
      "provider": "anthropic",
      "model": "claude-sonnet-4-5-20250929",
      "inputTokens": 3200,
      "outputTokens": 1500,
      "latencyMs": 4100
    },
    {
      "tenantId": "camp-beta",
      "service": "studio",
      "provider": "openai",
      "model": "gpt-4o-mini",
      "inputTokens": 500,
      "outputTokens": 200,
      "latencyMs": 900
    }
  ]
}
```

### 필드 설명

| 필드 | 타입 | 필수 | 제약 | 설명 |
|------|------|------|------|------|
| `tenantId` | string | O | 2~50자 | 테넌트 식별자 (`camp-alpha` 등) |
| `service` | string | O | 아래 목록 | 호출한 서비스명 |
| `provider` | string | O | 1~20자 | LLM 프로바이더 (`openai`, `anthropic`, `google` 등) |
| `model` | string | O | 1~100자 | 모델명 (`gpt-4o`, `claude-sonnet-4-5-20250929` 등) |
| `inputTokens` | integer | O | >= 0 | 입력 토큰 수 |
| `outputTokens` | integer | O | >= 0 | 출력 토큰 수 |
| `latencyMs` | integer | - | >= 0 | LLM 응답 시간 (밀리초) |

### 유효한 service 값

| 값 | 서비스 |
|----|--------|
| `dashboard` | 통합 대시보드 |
| `insight` | 데이터 분석 및 인사이트 |
| `studio` | AI 콘텐츠 제작 스튜디오 |
| `policy` | 정책 및 규칙 관리 |
| `ops` | 운영 자동화 |
| `hub` | 통합 허브 |

### 응답

**성공 (201)**
```json
{ "ok": true, "count": 1 }
```

**인증 실패 (401)**
```json
{ "error": "Invalid API key" }
```

**유효성 검사 실패 (400)**
```json
{ "error": "inputTokens는 0 이상의 정수여야 합니다." }
```

---

## 4. 구현 예시 (TypeScript)

### 기본 유틸리티

각 서비스에 아래 유틸리티를 추가합니다.

```typescript
// lib/usage-reporter.ts

const CONTROL_URL = process.env.CONTROL_URL; // e.g. https://campone-control-xxx.run.app
const SERVICE_API_KEY = process.env.SERVICE_API_KEY;

interface UsageReport {
  tenantId: string;
  service: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs?: number;
}

/**
 * LLM 사용량을 Control에 보고 (fire-and-forget)
 * 실패해도 서비스 동작에 영향을 주지 않습니다.
 */
export function reportUsage(report: UsageReport): void {
  if (!CONTROL_URL || !SERVICE_API_KEY) {
    return; // 개발 환경에서 설정 안 되어 있으면 무시
  }

  fetch(`${CONTROL_URL}/api/usage/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_API_KEY}`,
    },
    body: JSON.stringify(report),
  }).catch(() => {
    // fire-and-forget: 실패해도 무시
  });
}

/**
 * 배치 보고 (버퍼에 모았다가 한 번에 전송)
 */
const buffer: UsageReport[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function reportUsageBatched(report: UsageReport): void {
  if (!CONTROL_URL || !SERVICE_API_KEY) return;

  buffer.push(report);

  if (buffer.length >= 50) {
    flushUsageBuffer();
    return;
  }

  if (!flushTimer) {
    flushTimer = setTimeout(flushUsageBuffer, 10_000); // 10초마다 flush
  }
}

function flushUsageBuffer(): void {
  if (buffer.length === 0) return;

  const records = buffer.splice(0, 100);
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  fetch(`${CONTROL_URL}/api/usage/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_API_KEY}`,
    },
    body: JSON.stringify({ records }),
  }).catch(() => {});
}
```

### 사용 예시: LLM 호출 래퍼

```typescript
// lib/llm.ts
import { reportUsage } from './usage-reporter';

export async function callLLM(
  tenantId: string,
  prompt: string,
  options: { provider: string; model: string }
) {
  const start = Date.now();

  // 실제 LLM API 호출
  const response = await openai.chat.completions.create({
    model: options.model,
    messages: [{ role: 'user', content: prompt }],
  });

  const latencyMs = Date.now() - start;

  // 사용량 보고 (fire-and-forget, await 하지 않음)
  reportUsage({
    tenantId,
    service: 'studio',       // 현재 서비스명
    provider: options.provider,
    model: options.model,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    latencyMs,
  });

  return response;
}
```

### 사용 예시: Anthropic SDK

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { reportUsage } from './usage-reporter';

const anthropic = new Anthropic();

export async function callClaude(tenantId: string, prompt: string) {
  const start = Date.now();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  reportUsage({
    tenantId,
    service: 'insight',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs: Date.now() - start,
  });

  return response;
}
```

---

## 5. 환경 변수 설정

각 서비스의 Cloud Run 배포에 아래 환경변수를 추가합니다:

```yaml
# 각 서비스의 cloudbuild.yaml
- '--set-env-vars'
- 'CONTROL_URL=https://campone-control-415236799047.asia-northeast3.run.app'
- '--set-secrets'
- 'SERVICE_API_KEY=campone-usage-report-key:latest'
```

### GCP Secret Manager에 키 등록 (최초 1회)

```bash
# 랜덤 API key 생성 및 등록
openssl rand -base64 32 | gcloud secrets create campone-usage-report-key \
  --project=campone-plane \
  --data-file=-

# Cloud Run 서비스 계정에 접근 권한 부여
gcloud secrets add-iam-policy-binding campone-usage-report-key \
  --project=campone-plane \
  --member="serviceAccount:YOUR_SA@campone-plane.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 6. 테스트 방법

### curl로 직접 테스트

```bash
# 단건
curl -X POST https://campone-control-xxx.run.app/api/usage/report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "tenantId": "camp-test",
    "service": "studio",
    "provider": "openai",
    "model": "gpt-4o-mini",
    "inputTokens": 100,
    "outputTokens": 50,
    "latencyMs": 500
  }'

# 배치
curl -X POST https://campone-control-xxx.run.app/api/usage/report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "records": [
      { "tenantId": "camp-test", "service": "insight", "provider": "anthropic", "model": "claude-sonnet-4-5-20250929", "inputTokens": 200, "outputTokens": 100 },
      { "tenantId": "camp-test", "service": "studio", "provider": "openai", "model": "gpt-4o", "inputTokens": 300, "outputTokens": 150 }
    ]
  }'
```

### 확인

보고 후 Control 관리자 페이지에서 확인:
- `/billing` — 테넌트별 사용량 테이블에 반영
- `/monitoring` — 24시간 요청수, 토큰 카운트에 반영

---

## 7. FAQ

**Q: 보고 실패하면 데이터가 유실되나요?**
A: 네. fire-and-forget 방식이므로 네트워크 장애 등으로 보고에 실패하면 해당 건은 기록되지 않습니다. 정밀한 과금이 필요해지면 재시도 큐(Cloud Tasks 등)로 업그레이드할 수 있습니다.

**Q: 배치를 쓰는 게 좋나요?**
A: LLM 호출 빈도가 낮으면 단건으로 충분합니다. 초당 수십 건 이상이면 `reportUsageBatched()`로 10초/50건 단위 배치를 권장합니다.

**Q: 새 서비스를 추가하려면?**
A: Control의 `src/app/api/usage/report/route.ts`에서 `VALID_SERVICES` 배열에 추가하고, `src/app/(admin)/tenants/[tenantId]/page.tsx`의 `SERVICE_OPTIONS`에도 추가합니다.

**Q: provider/model은 자유 형식인가요?**
A: 네. 문자열 길이 제한(provider 20자, model 100자)만 지키면 됩니다. 일관성을 위해 아래 네이밍을 권장합니다:
- provider: `openai`, `anthropic`, `google`
- model: SDK 응답의 model 필드를 그대로 사용 (예: `gpt-4o-2024-08-06`)

---

## 8. 에러 보고 API

서비스에서 발생한 에러/경고를 Control에 보고합니다. 사용량 보고와 동일한 인증 방식(SERVICE_API_KEY)을 사용합니다.

### 엔드포인트

```
POST {CONTROL_URL}/api/monitoring/report
Content-Type: application/json
Authorization: Bearer {SERVICE_API_KEY}
```

### 단건 전송

```json
{
  "service": "insight",
  "tenantId": "camp-alpha",
  "level": "error",
  "message": "LLM API 호출 실패: 429 Too Many Requests",
  "stack": "Error: 429 Too Many Requests\n    at callLLM (/app/lib/llm.ts:45:11)\n    ...",
  "meta": {
    "provider": "openai",
    "model": "gpt-4o",
    "statusCode": 429,
    "endpoint": "/api/analysis/run"
  }
}
```

### 배치 전송 (최대 50건)

```json
{
  "records": [
    { "service": "insight", "level": "error", "message": "DB connection timeout" },
    { "service": "insight", "level": "warn", "message": "Slow query detected (3200ms)", "meta": { "query": "SELECT ..." } }
  ]
}
```

### 필드 설명

| 필드 | 타입 | 필수 | 제약 | 설명 |
|------|------|------|------|------|
| `service` | string | O | 아래 목록 | 보고하는 서비스명 |
| `tenantId` | string | - | 2~50자 | 관련 테넌트 (없으면 생략) |
| `level` | string | - | `error` \| `warn` | 기본값: `error` |
| `message` | string | O | 1~5000자 | 에러 메시지 |
| `stack` | string | - | - | 스택 트레이스 |
| `meta` | object | - | - | 추가 컨텍스트 (자유 형식 JSON) |

### 유효한 service 값

사용량 보고와 동일: `dashboard`, `insight`, `studio`, `policy`, `ops`, `hub`

### 응답

**성공 (201)**
```json
{ "ok": true, "count": 1 }
```

**인증 실패 (401)**
```json
{ "error": "Invalid API key" }
```

---

## 9. 에러 보고 구현 예시 (TypeScript)

```typescript
// lib/error-reporter.ts

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
 */
export function reportError(report: ErrorReport): void {
  if (!CONTROL_URL || !SERVICE_API_KEY) return;

  fetch(`${CONTROL_URL}/api/monitoring/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_API_KEY}`,
    },
    body: JSON.stringify(report),
  }).catch(() => {});
}
```

### 사용 예시: try-catch에서 보고

```typescript
import { reportError } from './error-reporter';

export async function runAnalysis(tenantId: string, params: AnalysisParams) {
  try {
    const result = await callLLM(tenantId, params);
    return result;
  } catch (err) {
    // Control에 에러 보고
    reportError({
      service: 'insight',
      tenantId,
      level: 'error',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      meta: { endpoint: '/api/analysis/run', params },
    });

    throw err; // 원래 에러는 그대로 전파
  }
}
```

### 사용 예시: 경고 보고

```typescript
// 슬로우 쿼리 감지 시 warn 보고
const start = Date.now();
const result = await db.query(sql);
const elapsed = Date.now() - start;

if (elapsed > 3000) {
  reportError({
    service: 'insight',
    tenantId,
    level: 'warn',
    message: `Slow query detected (${elapsed}ms)`,
    meta: { query: sql, elapsed },
  });
}
```

### 확인

보고 후 Control `/monitoring` 페이지에서 확인:
- **24h Errors** 카드 — 에러/경고 합계
- **서비스별 에러 통계** — 서비스×레벨별 카운트
- **최근 서비스 에러** — 상세 내역 (message, stack, meta 펼쳐보기)
