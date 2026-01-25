import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface KpiData {
  module: string;
  key: string;
  value: {
    value: number | string;
    unit?: string;
    change?: number;
  };
  expiresAt: string;
  updatedAt: string;
}

interface KpiResponse {
  kpi: KpiData[];
}

interface SaveKpiParams {
  module: string;
  key: string;
  value: number | string;
  unit?: string;
  change?: number;
  expiresInMinutes?: number;
}

// KPI 데이터 조회
async function fetchKpi(module?: string, key?: string): Promise<KpiResponse> {
  const params = new URLSearchParams();
  if (module) params.set('module', module);
  if (key) params.set('key', key);

  const response = await fetch(`/api/kpi?${params}`);

  if (!response.ok) {
    throw new Error('Failed to fetch KPI data');
  }

  return response.json();
}

// KPI 데이터 저장
async function saveKpi(params: SaveKpiParams): Promise<KpiData> {
  const response = await fetch('/api/kpi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to save KPI data');
  }

  const data = await response.json();
  return data.kpi;
}

/**
 * 모든 KPI 데이터를 가져오는 hook
 */
export function useKpiAll() {
  return useQuery({
    queryKey: ['kpi'],
    queryFn: () => fetchKpi(),
    refetchInterval: 60000, // 1분마다 자동 갱신
    staleTime: 30000, // 30초간 캐시 유지
  });
}

/**
 * 특정 모듈의 KPI 데이터를 가져오는 hook
 */
export function useKpiByModule(module: string) {
  return useQuery({
    queryKey: ['kpi', module],
    queryFn: () => fetchKpi(module),
    refetchInterval: 60000,
    staleTime: 30000,
    enabled: !!module,
  });
}

/**
 * 특정 모듈의 특정 KPI를 가져오는 hook
 */
export function useKpiSingle(module: string, key: string) {
  return useQuery({
    queryKey: ['kpi', module, key],
    queryFn: () => fetchKpi(module, key),
    refetchInterval: 60000,
    staleTime: 30000,
    enabled: !!module && !!key,
    select: (data) => data.kpi[0] || null,
  });
}

/**
 * KPI 데이터를 저장하는 hook
 */
export function useSaveKpi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveKpi,
    onSuccess: (data) => {
      // 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['kpi'] });
      queryClient.invalidateQueries({ queryKey: ['kpi', data.module] });
      queryClient.invalidateQueries({ queryKey: ['kpi', data.module, data.key] });
    },
  });
}

/**
 * KPI 값을 포맷팅하는 헬퍼 함수
 */
export function formatKpiValue(kpi: KpiData): string {
  const { value } = kpi.value;
  const unit = kpi.value.unit || '';

  if (typeof value === 'number') {
    // 천 단위 구분자 추가
    return `${value.toLocaleString()}${unit}`;
  }

  return `${value}${unit}`;
}

/**
 * KPI 변화율을 포맷팅하는 헬퍼 함수
 */
export function formatKpiChange(kpi: KpiData): string | null {
  const change = kpi.value.change;
  if (change === undefined || change === null) return null;

  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

/**
 * KPI 변화 방향을 반환하는 헬퍼 함수
 */
export function getKpiChangeDirection(kpi: KpiData): 'up' | 'down' | 'neutral' {
  const change = kpi.value.change;
  if (change === undefined || change === null || change === 0) return 'neutral';
  return change > 0 ? 'up' : 'down';
}
