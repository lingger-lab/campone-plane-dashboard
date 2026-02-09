import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const SERVICE_API_KEY = process.env.SERVICE_API_KEY;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

/**
 * 타이밍 세이프 문자열 비교
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * X-Service-Key 헤더 검증
 * SERVICE_API_KEY 또는 INTERNAL_API_KEY 중 하나와 일치하면 true
 */
export function isValidServiceKey(serviceKey: string | null): boolean {
  if (!serviceKey) return false;
  if (SERVICE_API_KEY && safeCompare(serviceKey, SERVICE_API_KEY)) return true;
  if (INTERNAL_API_KEY && safeCompare(serviceKey, INTERNAL_API_KEY)) return true;
  return false;
}

/**
 * 서비스 간 API 인증 검증
 *
 * 다른 서비스(Insight, Studio 등)가 Dashboard API를 호출할 때
 * X-Service-Key 헤더로 인증한다.
 *
 * @returns tenantId (X-Tenant-Id 헤더에서 추출) 또는 에러 응답
 */
export function validateServiceRequest(
  req: NextRequest
): { tenantId: string } | NextResponse {
  const serviceKey = req.headers.get('x-service-key');

  if (!SERVICE_API_KEY && !INTERNAL_API_KEY) {
    console.error('SERVICE_API_KEY / INTERNAL_API_KEY not configured');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  if (!isValidServiceKey(serviceKey)) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid or missing X-Service-Key' },
      { status: 401 }
    );
  }

  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'X-Tenant-Id header required' },
      { status: 400 }
    );
  }

  return { tenantId };
}
