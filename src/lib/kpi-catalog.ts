/**
 * 서비스별 KPI 카탈로그
 *
 * 각 서비스가 제공 가능한 KPI를 정의.
 * 관리자가 설정 페이지에서 선택하면 대시보드에 표시됨.
 */

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
  // Insights (pulse)
  { dbKey: 'Insights:trend_index', label: '여론 트렌드', unit: 'pt', changeLabel: '전주 대비', source: 'GT/Naver/SNS', service: 'insight', defaultValue: 0 },
  { dbKey: 'Insights:positive_ratio', label: '긍정 여론', unit: '%', changeLabel: '전주 대비', source: 'SNS 분석', service: 'insight', defaultValue: 0 },
  { dbKey: 'Insights:negative_ratio', label: '부정 여론', unit: '%', changeLabel: '전주 대비', source: 'SNS 분석', service: 'insight', defaultValue: 0 },
  { dbKey: 'Insights:mention_count', label: '언급량', unit: '건', changeLabel: '전주 대비', source: 'GT/Naver/SNS', service: 'insight', defaultValue: 0 },
  // Civic Hub
  { dbKey: 'Hub:total_questions', label: '시민 질문', unit: '건', changeLabel: '누적', source: 'Civic Hub', service: 'hub', defaultValue: 0 },
  { dbKey: 'Hub:response_rate', label: '응답률', unit: '%', changeLabel: '전주 대비', source: 'Civic Hub', service: 'hub', defaultValue: 0 },
  { dbKey: 'Hub:messages_sent', label: '발송 메시지', unit: '건', changeLabel: '전주 대비', source: 'Civic Hub', service: 'hub', defaultValue: 0 },
  // Policy Lab
  { dbKey: 'Policy:pledges_published', label: '공약 발표', unit: '건', changeLabel: '진행률', source: 'Policy Lab', service: 'policy', defaultValue: 0 },
  { dbKey: 'Policy:pledges_progress', label: '공약 이행률', unit: '%', changeLabel: '목표 대비', source: 'Policy Lab', service: 'policy', defaultValue: 0 },
  // Ops
  { dbKey: 'Ops:tasks_completed', label: '완료 업무', unit: '건', changeLabel: '이번 주', source: 'Ops', service: 'ops', defaultValue: 0 },
  { dbKey: 'Ops:upcoming_events', label: '예정 일정', unit: '건', changeLabel: '이번 주', source: 'Ops', service: 'ops', defaultValue: 0 },
  // Studio
  { dbKey: 'Studio:contents_published', label: '발행 콘텐츠', unit: '건', changeLabel: '이번 주', source: 'Studio', service: 'studio', defaultValue: 0 },
];

/** 기본 선택 KPI (설정 없을 때 하위 호환) */
export const DEFAULT_SELECTED_KPIS = [
  'Insights:trend_index',
  'Insights:positive_ratio',
  'Hub:total_questions',
  'Policy:pledges_published',
];

/** service → 서비스 한글명 매핑 */
export const SERVICE_LABELS: Record<string, string> = {
  insight: 'Insights (여론 분석)',
  hub: 'Civic Hub (시민 소통)',
  policy: 'Policy Lab (정책)',
  ops: 'Ops (운영)',
  studio: 'Studio (콘텐츠)',
};

/** enabled_services 값 → TenantFeatures 키 매핑 */
export const SERVICE_TO_FEATURE: Record<string, string> = {
  insight: 'pulse',
  studio: 'studio',
  policy: 'policy',
  ops: 'ops',
  hub: 'hub',
};
