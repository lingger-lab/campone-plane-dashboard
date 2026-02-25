import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSystemPrisma, getTenantPrisma } from '@/lib/prisma';
import { assertServiceAvailable, ServiceGuardError } from '@/lib/service-guard';
import { getTenantConfig, createDefaultTenantConfig } from '@/lib/tenant/config-loader';
import type { TenantConfig } from '@/lib/tenant/types';
import type { PrismaClient as SystemPrismaClient } from '@prisma/client';
import type { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';

export interface TenantContext {
  tenantId: string;
  config: TenantConfig;
  /** 테넌트 DB (업무 데이터: alerts, channels, kpi, etc.) */
  prisma: TenantPrismaClient;
  /** 시스템 DB (인증, 감사: users, user_tenants, audit_logs, etc.) */
  systemDb: SystemPrismaClient;
}

/**
 * API 라우트에서 테넌트 정보를 추출하고 검증합니다.
 *
 * @throws {Error} 테넌트가 없거나 권한이 없는 경우
 * @returns {Promise<TenantContext>} 테넌트 컨텍스트
 */
export async function getTenantFromRequest(): Promise<TenantContext> {
  // 1. 헤더에서 X-Tenant-ID 추출
  //    - 페이지 라우트: 미들웨어가 request header로 주입
  //    - API 라우트: 서비스 간 호출 시 클라이언트가 직접 전송
  const headersList = await headers();
  const tenantIdFromHeader = headersList.get('X-Tenant-ID');

  // 2. 세션에서 테넌트 ID 확인
  const session = await getServerSession(authOptions);
  const tenantIdFromSession = session?.user?.tenantId;

  // 3. 테넌트 ID 결정 (헤더 우선, 세션 폴백)
  const tenantId = tenantIdFromHeader || tenantIdFromSession;

  if (!tenantId) {
    throw new Error('Tenant ID not found. Please login again.');
  }

  // 4. 헤더와 세션의 테넌트가 일치하는지 확인 (보안)
  if (tenantIdFromHeader && tenantIdFromSession && tenantIdFromHeader !== tenantIdFromSession) {
    throw new Error('Tenant mismatch. Access denied.');
  }

  // 5. 테넌트 설정 로드 (YAML 우선, 없으면 시스템 DB 확인)
  let config = await getTenantConfig(tenantId);

  if (!config) {
    try {
      const sysDb = getSystemPrisma();
      const tenant = await sysDb.tenant.findUnique({
        where: { tenantId },
        select: { tenantId: true, name: true },
      });

      if (tenant) {
        config = createDefaultTenantConfig(tenantId);
        if (tenant.name) {
          config.name = tenant.name;
          config.displayName = tenant.name;
        }
      }
    } catch {
      if (tenantId.startsWith('camp-')) {
        config = createDefaultTenantConfig(tenantId);
      }
    }
  }

  if (!config) {
    throw new Error(`Tenant config not found: ${tenantId}`);
  }

  // 6. 서비스 가드: 점검 모드 + 테넌트 활성 + 서비스 활성 확인 (60초 캐시)
  await assertServiceAvailable(tenantId);

  // 7. DB 클라이언트
  const systemDb = getSystemPrisma();
  const prisma = await getTenantPrisma(tenantId);

  return {
    tenantId,
    config,
    prisma,
    systemDb,
  };
}

/**
 * 테넌트 ID만 빠르게 추출합니다 (설정/DB 로드 없이).
 * 단순 권한 체크나 로깅에 사용합니다.
 */
export async function getTenantIdFromRequest(): Promise<string> {
  const headersList = await headers();
  const tenantIdFromHeader = headersList.get('X-Tenant-ID');

  const session = await getServerSession(authOptions);
  const tenantIdFromSession = session?.user?.tenantId;

  const tenantId = tenantIdFromHeader || tenantIdFromSession;

  if (!tenantId) {
    throw new Error('Tenant ID not found. Please login again.');
  }

  if (tenantIdFromHeader && tenantIdFromSession && tenantIdFromHeader !== tenantIdFromSession) {
    throw new Error('Tenant mismatch. Access denied.');
  }

  return tenantId;
}

/**
 * API 응답 헬퍼: 에러 응답 생성
 */
export function createErrorResponse(message: string, status: number = 400) {
  return Response.json({ error: message }, { status });
}

/**
 * API 응답 헬퍼: 인증 에러 응답
 */
export function createUnauthorizedResponse(message: string = 'Unauthorized') {
  return Response.json({ error: message }, { status: 401 });
}

/**
 * API 응답 헬퍼: 금지 에러 응답
 */
export function createForbiddenResponse(message: string = 'Access denied') {
  return Response.json({ error: message }, { status: 403 });
}

/**
 * request.json()을 안전하게 파싱합니다.
 * 잘못된 JSON이면 400 응답을 반환합니다.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function safeParseJson<T = Record<string, any>>(
  request: Request
): Promise<T | Response> {
  try {
    return (await request.json()) as T;
  } catch {
    return Response.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }
}

/**
 * limit 파라미터를 안전하게 파싱합니다.
 */
export function safeParseLimit(
  value: string | null,
  defaultValue = 20,
  max = 100
): number {
  const parsed = parseInt(value || String(defaultValue), 10);
  if (isNaN(parsed) || parsed < 1) return defaultValue;
  return Math.min(parsed, max);
}

/**
 * API 라우트 catch 블록에서 사용하는 에러 핸들러.
 *
 * ServiceGuardError(점검/비활성) → 503/403
 * 그 외 → 500
 */
export function handleRouteError(
  error: unknown,
  context?: string
): NextResponse {
  if (error instanceof ServiceGuardError) {
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status: error.status }
    );
  }

  console.error(context || 'API error:', error);
  return NextResponse.json(
    { error: 'Internal Server Error' },
    { status: 500 }
  );
}
