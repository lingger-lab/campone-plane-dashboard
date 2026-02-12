/**
 * 공유 서비스 URL (전역 단일 소스)
 *
 * 새 아키텍처(동일 서비스, 개별 DB)에서는 모든 테넌트가 동일한 서비스를 사용합니다.
 * 서버 사이드에서는 환경변수로 오버라이드 가능.
 * 클라이언트 사이드에서는 빌드 타임 상수를 사용합니다.
 */

import type { TenantServices } from '@/lib/tenant/types';

// ============================================
// 빌드 타임 상수 (클라이언트 + 서버 모두 사용 가능)
// ============================================

export const SERVICE_URL_INSIGHTS = 'https://insight-frontend-i2syevvyaq-du.a.run.app';
export const SERVICE_URL_INSIGHTS_BACKEND = 'https://insight-backend-i2syevvyaq-du.a.run.app';
export const SERVICE_URL_STUDIO = 'https://campone-studio-i2syevvyaq-du.a.run.app';
export const SERVICE_URL_POLICY = 'https://campone-policy-i2syevvyaq-du.a.run.app';
export const SERVICE_URL_OPS = 'https://campone-ops-i2syevvyaq-du.a.run.app';
export const SERVICE_URL_HUB = 'https://campone-civichub-i2syevvyaq-du.a.run.app';
export const SERVICE_URL_DASHBOARD = 'https://campone-dashboard-i2syevvyaq-du.a.run.app';

// ============================================
// 서버 사이드 함수 (환경변수 오버라이드)
// ============================================

/** 기본 서비스 URL (서버: 환경변수 우선, 클라이언트: 상수) */
export function getDefaultServiceUrls(): TenantServices {
  return {
    insights: process.env.INSIGHTS_SERVICE_URL || SERVICE_URL_INSIGHTS,
    studio: process.env.STUDIO_SERVICE_URL || SERVICE_URL_STUDIO,
    policy: process.env.POLICY_SERVICE_URL || SERVICE_URL_POLICY,
    ops: process.env.OPS_SERVICE_URL || SERVICE_URL_OPS,
    hub: process.env.HUB_SERVICE_URL || SERVICE_URL_HUB,
  };
}

// ============================================
// 클라이언트 사이드 상수 (postMessage 허용 목록)
// ============================================

/** 프로덕션 허용 Origin 목록 */
export const PRODUCTION_ORIGINS = [
  SERVICE_URL_INSIGHTS,
  SERVICE_URL_INSIGHTS_BACKEND,
  SERVICE_URL_STUDIO,
  SERVICE_URL_POLICY,
  SERVICE_URL_OPS,
  SERVICE_URL_HUB,
  SERVICE_URL_DASHBOARD,
];

/** 개발 환경 허용 Origin 목록 */
export const DEV_ORIGINS = [
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:5173',
  'http://localhost:8000',
];
