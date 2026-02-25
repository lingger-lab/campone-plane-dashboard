/**
 * CampOne 서비스 가드 — 점검 모드 + 테넌트 상태 확인
 *
 * 가이드: docs/SERVICE_MAINTENANCE_GUIDE.md
 *
 * 데이터 소스: 시스템 DB (campone_system)
 *  - platform_config 테이블: 점검 모드 (key: maintenance.dashboard)
 *  - tenants 테이블: 테넌트 활성/서비스 사용 여부
 *
 * 두 종류의 캐시 (60초 TTL):
 *  1. maintenanceCache — platform_config 조회 결과
 *  2. tenantStatusCache — tenants 조회 결과
 */

import { getSystemPrisma } from '@/lib/prisma';

const SERVICE_NAME = 'dashboard';
const CACHE_TTL = 60_000; // 60초

// ============================================
// 1. 점검 모드 (Maintenance) — platform_config 테이블
// ============================================

export interface MaintenanceStatus {
  maintenance: boolean;
  message: string;
}

/**
 * Prisma JsonValue에서 점검 상태를 안전하게 파싱
 */
function parseMaintenanceValue(value: unknown): MaintenanceStatus {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return { maintenance: false, message: '' };
  }

  const obj = value as Record<string, unknown>;
  return {
    maintenance: obj.enabled === true,
    message: typeof obj.message === 'string' ? obj.message : '',
  };
}

let maintenanceCache: {
  data: MaintenanceStatus;
  expiresAt: number;
} | null = null;

/**
 * 서비스 점검 모드 확인 (60초 캐시)
 *
 * platform_config 테이블에서 key = 'maintenance.dashboard' 조회
 * value: { "enabled": true/false, "message": "점검 안내 메시지" }
 */
export async function checkMaintenance(): Promise<MaintenanceStatus> {
  // 캐시 유효하면 즉시 반환
  if (maintenanceCache && maintenanceCache.expiresAt > Date.now()) {
    return maintenanceCache.data;
  }

  try {
    const systemDb = getSystemPrisma();
    const config = await systemDb.platformConfig.findUnique({
      where: { key: `maintenance.${SERVICE_NAME}` },
    });

    const data = config
      ? parseMaintenanceValue(config.value)
      : { maintenance: false, message: '' };

    maintenanceCache = { data, expiresAt: Date.now() + CACHE_TTL };
    return data;
  } catch (error) {
    // DB 장애 시 점검 아님으로 간주 (서비스 가용성 우선)
    console.warn('[service-guard] Failed to check maintenance:', error);
    return { maintenance: false, message: '' };
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
 * @throws {ServiceGuardError} 점검/비활성/미사용 시
 */
export async function assertServiceAvailable(tenantId: string): Promise<void> {
  // 1. 점검 모드 확인
  const maintenance = await checkMaintenance();
  if (maintenance.maintenance) {
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
