/**
 * 테넌트 설정 로더
 *
 * 로드 우선순위:
 * 1. 메모리 캐시
 * 2. 로컬 YAML 파일: src/config/tenants/{id}.yaml
 */

import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import type { TenantConfig } from './types';
import { getDefaultServiceUrls } from '@/lib/service-urls';

// 메모리 캐시
const memoryCache = new Map<string, { config: TenantConfig; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분

/**
 * 로컬 파일에서 테넌트 설정 로드
 */
async function loadFromLocalFile(tenantId: string): Promise<TenantConfig | null> {
  try {
    // src/config/tenants/{tenantId}.yaml 경로
    const configPath = path.join(process.cwd(), 'src', 'config', 'tenants', `${tenantId}.yaml`);

    if (!fs.existsSync(configPath)) {
      return null;
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const config = yaml.load(content) as TenantConfig;

    return config;
  } catch (error) {
    console.error(`Failed to load local config for ${tenantId}:`, error);
    return null;
  }
}

/**
 * 메모리 캐시에서 설정 가져오기
 */
function getFromMemoryCache(tenantId: string): TenantConfig | null {
  const cached = memoryCache.get(tenantId);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.config;
  }

  // 만료된 캐시 삭제
  if (cached) {
    memoryCache.delete(tenantId);
  }

  return null;
}

/**
 * 메모리 캐시에 설정 저장
 */
function setMemoryCache(tenantId: string, config: TenantConfig): void {
  memoryCache.set(tenantId, {
    config,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * 테넌트 설정 로드
 *
 * @param tenantId 테넌트 ID
 * @returns 테넌트 설정 또는 null
 */
export async function getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
  // 1. 메모리 캐시 확인
  const cached = getFromMemoryCache(tenantId);
  if (cached) {
    return cached;
  }

  // 2. 로컬 파일 확인
  const config = await loadFromLocalFile(tenantId);

  // 3. 캐시에 저장
  if (config) {
    setMemoryCache(tenantId, config);
  }

  return config;
}

/**
 * 테넌트 존재 여부 확인
 */
export async function validateTenant(tenantId: string): Promise<boolean> {
  const config = await getTenantConfig(tenantId);
  return config !== null;
}

/**
 * 테넌트 설정 캐시 무효화
 */
export function invalidateTenantCache(tenantId: string): void {
  memoryCache.delete(tenantId);
}

/**
 * 모든 캐시 무효화
 */
export function invalidateAllCache(): void {
  memoryCache.clear();
}

/**
 * 기본 테넌트 설정 생성 (테스트/개발용)
 */
export function createDefaultTenantConfig(tenantId: string): TenantConfig {
  return {
    id: tenantId,
    name: tenantId,
    displayName: `${tenantId} 캠프`,
    serviceMode: 'dashboard',
    enabledApps: ['insight', 'policy', 'ops', 'studio', 'hub', 'dashboard'],
    auth: {
      sessionDurationHours: 24,
    },
    database: {
      host: 'localhost',
      port: 5432,
      name: 'campone',
      credentials: 'local',
    },
    features: {
      pulse: true,
      studio: true,
      policy: true,
      ops: true,
      hub: true,
    },
    branding: {
      primaryColor: '#2563EB',
      logo: '/camponelogo.svg',
    },
    services: getDefaultServiceUrls(),
  };
}
