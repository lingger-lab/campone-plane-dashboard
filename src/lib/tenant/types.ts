/**
 * CampOne 멀티테넌트 타입 정의
 */

export interface TenantDatabase {
  host: string;
  port: number;
  name: string;
  /** Secret Manager 참조 키 (프로덕션) 또는 직접 연결 문자열 (개발) */
  credentials: string;
}

export interface TenantFeatures {
  pulse: boolean;
  studio: boolean;
  policy: boolean;
  ops: boolean;
  hub: boolean;
}

export interface TenantBranding {
  primaryColor: string;
  secondaryColor?: string;
  logo: string;
  favicon?: string;
  fontFamily?: string;
}

export interface TenantServices {
  insights: string;
  studio: string;
  policy: string;
  ops: string;
  hub: string;
}

export interface TenantLLM {
  provider: 'anthropic' | 'openai' | 'google';
  apiKey: string;
  model?: string;
}

export interface TenantLimits {
  llmTokensMonthly?: number;
  llmTokensDaily?: number;
  apiRequestsPerMinute?: number;
}

export interface TenantLifecycle {
  electionDate?: string;
  dataRetentionDays?: number;
  exportBeforeDeletion?: boolean;
}

export interface TenantConfig {
  /** 테넌트 고유 ID (URL에 사용, e.g., "camp-a") */
  id: string;
  /** 테넌트 이름 */
  name: string;
  /** 표시용 이름 */
  displayName: string;
  /** 생성일 */
  createdAt?: string;

  /** 서비스 제공 방식: dashboard(통합 대시보드) | individual(개별 서비스 직접 접속) */
  serviceMode: 'dashboard' | 'individual';

  /** 활성화된 앱 목록 */
  enabledApps: string[];

  /** 인증 설정 */
  auth: {
    sessionDurationHours: number;
  };

  /** 데이터베이스 연결 정보 */
  database: TenantDatabase;

  /** 기능 플래그 */
  features: TenantFeatures;

  /** 브랜딩 설정 */
  branding: TenantBranding;

  /** 외부 서비스 URL */
  services: TenantServices;

  /** LLM 설정 (테넌트별 API 키) */
  llm?: TenantLLM;

  /** 사용량 제한 */
  limits?: TenantLimits;

  /** 생명주기 설정 */
  lifecycle?: TenantLifecycle;
}

/** 테넌트 컨텍스트 값 */
export interface TenantContextValue {
  tenantId: string;
  config: TenantConfig;
  isLoading: boolean;
  error: string | null;
}
