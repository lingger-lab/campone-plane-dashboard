/**
 * 서비스별 KPI 카탈로그
 *
 * 각 서비스가 제공 가능한 KPI를 정의.
 * 관리자가 설정 페이지에서 선택하면 대시보드에 표시됨.
 */

import type { TenantFeatures } from '@/lib/tenant/types';

export interface KpiDefinition {
  /** KpiCache key 형식: "Module:key" */
  dbKey: string;
  label: string;
  unit?: string;
  changeLabel: string;
  source?: string;
  /** enabled_services 값과 매핑 */
  service: 'insight' | 'studio' | 'policy' | 'ops' | 'hub';
  defaultValue: number;
  defaultChange?: number;
}

export const KPI_CATALOG: KpiDefinition[] = [
  // ── Insights (pulse) ──
  { dbKey: 'Insights:positive_ratio', label: '긍정 여론', unit: '%', changeLabel: '전주 대비', source: 'SNS 분석', service: 'insight', defaultValue: 0 },
  { dbKey: 'Insights:negative_ratio', label: '부정 여론', unit: '%', changeLabel: '전주 대비', source: 'SNS 분석', service: 'insight', defaultValue: 0 },
  { dbKey: 'Insights:mention_count', label: '언급량', unit: '건', changeLabel: '전주 대비', source: 'GT/Naver/SNS', service: 'insight', defaultValue: 0 },
  { dbKey: 'Insights:recognition_score', label: '인지도', unit: '점', changeLabel: '전주 대비', source: 'Insights', service: 'insight', defaultValue: 0 },
  { dbKey: 'Insights:support_score', label: '지지도', unit: '점', changeLabel: '전주 대비', source: 'Insights', service: 'insight', defaultValue: 0 },
  { dbKey: 'Insights:total_risks', label: '리스크', unit: '건', changeLabel: '분석 결과', source: 'Insights', service: 'insight', defaultValue: 0 },
  { dbKey: 'Insights:high_risks', label: '고위험 리스크', unit: '건', changeLabel: '분석 결과', source: 'Insights', service: 'insight', defaultValue: 0 },
  { dbKey: 'Insights:visibility_score', label: '디지털 가시성', unit: '점', changeLabel: '평균', source: 'Insights', service: 'insight', defaultValue: 0 },
  { dbKey: 'Insights:sentiment_score', label: '감성 점수', unit: '%', changeLabel: '전체 평균', source: 'SNS 분석', service: 'insight', defaultValue: 0 },
  { dbKey: 'Insights:trend_index', label: '종합 여론 지수', unit: '점', changeLabel: '전주 대비', source: 'GT/Naver/SNS', service: 'insight', defaultValue: 0 },
  { dbKey: 'Insights:top_issues_count', label: '주요 이슈', unit: '개', changeLabel: '분석 결과', source: 'Insights', service: 'insight', defaultValue: 0 },
  { dbKey: 'Insights:emerging_issues', label: '부상 이슈', unit: '개', changeLabel: '분석 결과', source: 'Insights', service: 'insight', defaultValue: 0 },
  { dbKey: 'Insights:analyzed_regions', label: '분석 지역', unit: '개', changeLabel: '분석 결과', source: 'Insights', service: 'insight', defaultValue: 0 },
  { dbKey: 'Insights:visibility_candidates', label: '가시성 후보', unit: '명', changeLabel: '분석 결과', source: 'Insights', service: 'insight', defaultValue: 0 },
  { dbKey: 'Insights:spike_count', label: '바이럴 스파이크', unit: '건', changeLabel: '분석 결과', source: 'Insights', service: 'insight', defaultValue: 0 },
  // ── Civic Hub ──
  { dbKey: 'Hub:pending_review', label: '대기 질문', unit: '건', changeLabel: '현재', source: 'Civic Hub', service: 'hub', defaultValue: 0 },
  { dbKey: 'Hub:pending_inquiries', label: '대기 민원', unit: '건', changeLabel: '현재', source: 'Civic Hub', service: 'hub', defaultValue: 0 },
  { dbKey: 'Hub:open_tickets', label: '처리중 티켓', unit: '건', changeLabel: '현재', source: 'Civic Hub', service: 'hub', defaultValue: 0 },
  { dbKey: 'Hub:questions_today', label: '오늘 질문', unit: '건', changeLabel: '오늘', source: 'Civic Hub', service: 'hub', defaultValue: 0 },
  { dbKey: 'Hub:total_questions', label: '전체 질문', unit: '건', changeLabel: '누적', source: 'Civic Hub', service: 'hub', defaultValue: 0 },
  { dbKey: 'Hub:quality_pass_rate', label: '품질 통과율', unit: '%', changeLabel: '현재', source: 'Civic Hub', service: 'hub', defaultValue: 0 },
  { dbKey: 'Hub:total_inquiries', label: '전체 민원', unit: '건', changeLabel: '누적', source: 'Civic Hub', service: 'hub', defaultValue: 0 },
  // ── Policy Lab ──
  { dbKey: 'Policy:completed_phases', label: '완료 단계', unit: '단계', changeLabel: '6단계 중', source: 'Policy Lab', service: 'policy', defaultValue: 0 },
  { dbKey: 'Policy:analysis_progress', label: '분석 진행률', unit: '%', changeLabel: '전체 대비', source: 'Policy Lab', service: 'policy', defaultValue: 0 },
  { dbKey: 'Policy:recognition_score', label: '인지도', unit: '%', changeLabel: 'ME 분석', source: 'Policy Lab', service: 'policy', defaultValue: 0 },
  { dbKey: 'Policy:support_score', label: '지지도', unit: '%', changeLabel: 'ME 분석', source: 'Policy Lab', service: 'policy', defaultValue: 0 },
  { dbKey: 'Policy:organization_score', label: '조직력', unit: '%', changeLabel: 'ME 분석', source: 'Policy Lab', service: 'policy', defaultValue: 0 },
  { dbKey: 'Policy:expandability_score', label: '확장성', unit: '%', changeLabel: 'ME 분석', source: 'Policy Lab', service: 'policy', defaultValue: 0 },
  { dbKey: 'Policy:credibility_score', label: '신뢰도', unit: '%', changeLabel: 'ME 분석', source: 'Policy Lab', service: 'policy', defaultValue: 0 },
  { dbKey: 'Policy:issue_control_score', label: '이슈 컨트롤', unit: '%', changeLabel: 'ME 분석', source: 'Policy Lab', service: 'policy', defaultValue: 0 },
  { dbKey: 'Policy:target_vote_pct', label: '목표 득표율', unit: '%', changeLabel: 'PLAN 분석', source: 'Policy Lab', service: 'policy', defaultValue: 0 },
  { dbKey: 'Policy:top_risks_count', label: '상위 리스크', unit: '건', changeLabel: '분석 결과', source: 'Policy Lab', service: 'policy', defaultValue: 0 },
  // ── Ops ──
  { dbKey: 'Ops:task_completion', label: '업무 완료율', unit: '%', changeLabel: '현재', source: 'Ops', service: 'ops', defaultValue: 0 },
  { dbKey: 'Ops:pending_tasks', label: '대기 업무', unit: '건', changeLabel: '현재', source: 'Ops', service: 'ops', defaultValue: 0 },
  { dbKey: 'Ops:urgent_tasks', label: '긴급 업무', unit: '건', changeLabel: '현재', source: 'Ops', service: 'ops', defaultValue: 0 },
  { dbKey: 'Ops:upcoming_events', label: '예정 일정', unit: '건', changeLabel: '이번 주', source: 'Ops', service: 'ops', defaultValue: 0 },
  { dbKey: 'Ops:today_schedule', label: '오늘 일정', unit: '건', changeLabel: '현재', source: 'Ops', service: 'ops', defaultValue: 0 },
  { dbKey: 'Ops:public_events', label: '공개 일정', unit: '건', changeLabel: '현재', source: 'Ops', service: 'ops', defaultValue: 0 },
  // ── Studio (서비스 미구현 — 추후 추가) ──
];

/** 기본 선택 KPI (설정 없을 때 하위 호환) */
export const DEFAULT_SELECTED_KPIS = [
  'Insights:positive_ratio',
  'Insights:mention_count',
  'Hub:pending_review',
  'Policy:analysis_progress',
  'Ops:task_completion',
  'Ops:upcoming_events',
];

/** service → 서비스 한글명 매핑 */
export const SERVICE_LABELS: Record<string, string> = {
  insight: 'Insights (여론 분석)',
  hub: 'Civic Hub (시민 소통)',
  policy: 'Policy Lab (정책)',
  ops: 'Ops (운영)',
  studio: 'Studio (콘텐츠)',
};

/** enabled_services 값 → TenantFeatures 키 매핑 (단일 소스) */
export const SERVICE_TO_FEATURE: Record<string, keyof TenantFeatures> = {
  insight: 'pulse',
  studio: 'studio',
  policy: 'policy',
  ops: 'ops',
  hub: 'hub',
};
