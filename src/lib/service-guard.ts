/**
 * CampOne 서비스 가드 — 점검 모드 + 테넌트 상태 확인
 *
 * 가이드: docs/SERVICE_MAINTENANCE_GUIDE.md
 *
 * 데이터 소스:
 *  - 점검/예고: Control API (GET /api/services/status?service=dashboard)
 *  - 테넌트 상태: 시스템 DB (tenants 테이블)
 *
 * 두 종류의 캐시 (60초 TTL):
 *  1. maintenanceCache — Control API 조회 결과
 *  2. tenantStatusCache — tenants 조회 결과
 */

import { getSystemPrisma } from '@/lib/prisma';

const SERVICE_NAME = 'dashboard';
const CACHE_TTL = 60_000; // 60초
const CONTROL_URL = process.env.CONTROL_URL;

// ============================================
// 1. 점검 모드 (Maintenance) — Control API
// ============================================

export interface MaintenanceStatus {
  maintenance: boolean;
  message: string;
  notice: string;
}

const DEFAULT_STATUS: MaintenanceStatus = {
  maintenance: false,
  message: '',
  notice: '',
};

let maintenanceCache: {
  data: MaintenanceStatus;
  expiresAt: number;
} | null = null;

/**
 * 서비스 점검/예고 상태 확인 (60초 캐시)
 *
 * Control API: GET {CONTROL_URL}/api/services/status?service=dashboard
 * 응답: { maintenance: boolean, message: string, notice: string }
 */
export async function checkMaintenance(): Promise<MaintenanceStatus> {
  if (maintenanceCache && maintenanceCache.expiresAt > Date.now()) {
    return maintenanceCache.data;
  }

  if (!CONTROL_URL) {
    console.warn('[service-guard] CONTROL_URL not configured');
    return DEFAULT_STATUS;
  }

  try {
    const res = await fetch(
      `${CONTROL_URL}/api/services/status?service=${SERVICE_NAME}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!res.ok) {
      console.warn(`[service-guard] Control API returned ${res.status}`);
      return DEFAULT_STATUS;
    }

    const json = await res.json();
    const data: MaintenanceStatus = {
      maintenance: json.maintenance === true,
      message: typeof json.message === 'string' ? json.message : '',
      notice: typeof json.notice === 'string' ? json.notice : '',
    };

    maintenanceCache = { data, expiresAt: Date.now() + CACHE_TTL };
    return data;
  } catch (error) {
    // Control 장애 시 점검 아님으로 간주 (서비스 가용성 우선)
    console.warn('[service-guard] Failed to check maintenance:', error);
    return DEFAULT_STATUS;
  }
}

// ============================================
// 2. 테넌트 상태 — tenants 테이블
// ============================================

interface TenantStatus {
  isActive: boolean;
  enabledServices: Record<string, boolean>;
}

const tenantStatusCache = new Map<
  string,
  { data: TenantStatus; expiresAt: number }
>();

/**
 * 테넌트 활성/서비스 상태 확인 (60초 캐시)
 *
 * tenants.is_active + tenants.enabled_services 조회
 */
export async function checkTenantStatus(
  tenantId: string
): Promise<TenantStatus> {
  const cached = tenantStatusCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const systemDb = getSystemPrisma();
    const tenant = await systemDb.tenant.findUnique({
      where: { tenantId },
      select: { isActive: true, enabledServices: true },
    });

    if (!tenant) {
      return { isActive: false, enabledServices: {} };
    }

    const data: TenantStatus = {
      isActive: tenant.isActive,
      enabledServices:
        (tenant.enabledServices as Record<string, boolean>) ?? {},
    };

    tenantStatusCache.set(tenantId, {
      data,
      expiresAt: Date.now() + CACHE_TTL,
    });
    return data;
  } catch (error) {
    console.warn('[service-guard] Failed to check tenant status:', error);
    // DB 장애 시 허용 (서비스 가용성 우선)
    return { isActive: true, enabledServices: {} };
  }
}

// ============================================
// 3. 통합 서비스 가드
// ============================================

export class ServiceGuardError extends Error {
  constructor(
    public readonly code: 'MAINTENANCE' | 'TENANT_INACTIVE' | 'SERVICE_DISABLED',
    message: string,
    public readonly status: 503 | 403
  ) {
    super(message);
    this.name = 'ServiceGuardError';
  }
}

/**
 * 서비스 접근 가능 여부 확인
 *
 * @param tenantId 테넌트 ID
 * @param isSystemAdmin 시스템 관리자 여부 — true이면 점검 모드를 우회
 * @throws {ServiceGuardError} 점검/비활성/미사용 시
 */
export async function assertServiceAvailable(
  tenantId: string,
  isSystemAdmin = false
): Promise<void> {
  // 1. 점검 모드 확인 — 시스템 관리자는 우회
  const maintenance = await checkMaintenance();
  if (maintenance.maintenance && !isSystemAdmin) {
    throw new ServiceGuardError(
      'MAINTENANCE',
      maintenance.message || '서비스 점검 중입니다. 잠시 후 다시 시도해주세요.',
      503
    );
  }

  // 2. 테넌트 상태 확인
  const tenantStatus = await checkTenantStatus(tenantId);

  if (!tenantStatus.isActive) {
    throw new ServiceGuardError(
      'TENANT_INACTIVE',
      '현재 서비스가 중지된 상태입니다. 관리자에게 문의하세요.',
      403
    );
  }

  // 3. enabledServices 확인
  // enabledServices가 빈 객체이면 (설정 안 됨) → 모든 서비스 허용
  const services = tenantStatus.enabledServices;
  if (
    Object.keys(services).length > 0 &&
    services[SERVICE_NAME] === false
  ) {
    throw new ServiceGuardError(
      'SERVICE_DISABLED',
      '이 캠프에서는 대시보드 서비스를 사용할 수 없습니다.',
      403
    );
  }
}
