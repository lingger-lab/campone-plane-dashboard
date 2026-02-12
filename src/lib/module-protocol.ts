/**
 * CampOne Dashboard - 모듈 간 통신 프로토콜
 *
 * 이 파일은 iframe으로 임베드된 모듈들이 Dashboard로 메시지를 보낼 때
 * 사용해야 하는 메시지 형식을 정의합니다.
 *
 * 모듈 개발팀에게 이 프로토콜을 공유하세요.
 */

import { PRODUCTION_ORIGINS, DEV_ORIGINS } from '@/lib/service-urls';

// ============================================
// 메시지 타입 정의
// ============================================

// 모듈 → 대시보드 메시지 타입
export type ModuleMessageType =
  | 'ACTIVITY'      // 사용자 활동 기록
  | 'ALERT'         // 알림 생성
  | 'KPI_UPDATE'    // KPI 데이터 업데이트
  | 'NAVIGATION'    // 페이지 이동 요청
  | 'ERROR'         // 에러 보고
  | 'READY';        // 모듈 로드 완료

// 대시보드 → 모듈 메시지 타입
export type DashboardMessageType = 'THEME_CHANGE';

export type ThemeValue = 'light' | 'dark';

export type ModuleName = 'Insights' | 'Studio' | 'Policy' | 'Ops' | 'Hub';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'success';

// ============================================
// 메시지 페이로드 타입
// ============================================

export interface ActivityPayload {
  action: string;           // 수행한 작업 (예: "문서 생성", "메시지 발송")
  target?: string;          // 대상 (예: "공약 #3", "세그먼트 A")
  details?: Record<string, unknown>; // 추가 정보
}

export interface AlertPayload {
  severity: AlertSeverity;
  title: string;
  message: string;
  pinned?: boolean;
  expiresInMinutes?: number; // 만료 시간 (분 단위)
}

export interface KpiUpdatePayload {
  key: string;              // KPI 식별자
  value: number | string;
  unit?: string;
  change?: number;          // 변화율 (%)
}

export interface NavigationPayload {
  path: string;             // 이동할 경로
  external?: boolean;       // 외부 링크 여부
}

export interface ErrorPayload {
  code: string;
  message: string;
  stack?: string;
}

export interface ReadyPayload {
  version?: string;
}

// 대시보드 → 모듈 페이로드
export interface ThemeChangePayload {
  theme: ThemeValue;
}

// ============================================
// 통합 메시지 타입
// ============================================

export interface ModuleMessage {
  type: ModuleMessageType;
  source: ModuleName;
  timestamp: number;        // Date.now()
  payload:
    | ActivityPayload
    | AlertPayload
    | KpiUpdatePayload
    | NavigationPayload
    | ErrorPayload
    | ReadyPayload;
}

// 대시보드 → 모듈 메시지
export interface DashboardMessage {
  type: DashboardMessageType;
  source: 'Dashboard';
  timestamp: number;
  payload: ThemeChangePayload;
}

// ============================================
// 허용된 Origin 목록 (service-urls.ts에서 단일 관리)
// ============================================

export const ALLOWED_ORIGINS = [
  ...PRODUCTION_ORIGINS,
  ...DEV_ORIGINS,
];

// ============================================
// 유효성 검사 함수
// ============================================

export function isValidModuleMessage(data: unknown): data is ModuleMessage {
  if (!data || typeof data !== 'object') return false;

  const msg = data as Record<string, unknown>;

  // 필수 필드 확인
  if (!msg.type || !msg.source || !msg.timestamp || !msg.payload) {
    return false;
  }

  // 타입 확인
  const validTypes: ModuleMessageType[] = [
    'ACTIVITY', 'ALERT', 'KPI_UPDATE', 'NAVIGATION', 'ERROR', 'READY'
  ];
  if (!validTypes.includes(msg.type as ModuleMessageType)) {
    return false;
  }

  // 모듈 이름 확인
  const validModules: ModuleName[] = ['Insights', 'Studio', 'Policy', 'Ops', 'Hub'];
  if (!validModules.includes(msg.source as ModuleName)) {
    return false;
  }

  return true;
}

// ============================================
// 모듈에서 사용할 헬퍼 함수 (복사해서 사용)
// ============================================

/**
 * 모듈에서 Dashboard로 메시지를 보내는 헬퍼 함수
 * 각 모듈 프로젝트에 복사해서 사용하세요.
 *
 * @example
 * // 활동 기록
 * sendToDashboard('ACTIVITY', 'Policy', {
 *   action: '공약 수정',
 *   target: '청년 일자리 공약',
 * });
 *
 * // 알림 생성
 * sendToDashboard('ALERT', 'Insights', {
 *   severity: 'warning',
 *   title: '여론 급증 감지',
 *   message: 'SNS 멘션이 30% 증가했습니다.',
 * });
 */
export function sendToDashboard<T extends ModuleMessageType>(
  type: T,
  source: ModuleName,
  payload: T extends 'ACTIVITY' ? ActivityPayload
    : T extends 'ALERT' ? AlertPayload
    : T extends 'KPI_UPDATE' ? KpiUpdatePayload
    : T extends 'NAVIGATION' ? NavigationPayload
    : T extends 'ERROR' ? ErrorPayload
    : ReadyPayload
): void {
  // iframe 내부인지 확인
  if (typeof window === 'undefined' || window.parent === window) {
    console.warn('[Module] Not in iframe context, message not sent');
    return;
  }

  const message: ModuleMessage = {
    type,
    source,
    timestamp: Date.now(),
    payload,
  };

  // Dashboard로 메시지 전송
  window.parent.postMessage(message, '*');

  console.log(`[Module:${source}] Sent message:`, message);
}

// ============================================
// 대시보드에서 사용할 헬퍼 함수
// ============================================

/**
 * 모든 iframe 모듈에 테마 변경을 알리는 함수
 * Dashboard에서 테마가 변경될 때 호출하세요.
 *
 * @example
 * broadcastThemeChange('dark');
 */
export function broadcastThemeChange(theme: ThemeValue): void {
  if (typeof window === 'undefined') return;

  const message: DashboardMessage = {
    type: 'THEME_CHANGE',
    source: 'Dashboard',
    timestamp: Date.now(),
    payload: { theme },
  };

  // 모든 iframe에 메시지 전송
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach((iframe) => {
    try {
      iframe.contentWindow?.postMessage(message, '*');
    } catch (e) {
      console.warn('[Dashboard] Failed to send theme to iframe:', e);
    }
  });

  console.log(`[Dashboard] Broadcast theme change:`, theme);
}