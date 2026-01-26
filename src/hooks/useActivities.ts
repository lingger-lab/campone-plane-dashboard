import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Activity {
  id: string;
  userName: string;
  action: string;
  module: string;
  target: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

interface ActivitiesResponse {
  activities: Activity[];
}

interface CreateActivityParams {
  action: string;
  module: string;
  target?: string;
  details?: Record<string, unknown>;
}

// 활동 목록 조회
async function fetchActivities(limit = 20, module?: string): Promise<ActivitiesResponse> {
  const params = new URLSearchParams();
  params.set('limit', limit.toString());
  if (module) params.set('module', module);

  const response = await fetch(`/api/activities?${params}`);

  if (!response.ok) {
    throw new Error('Failed to fetch activities');
  }

  return response.json();
}

// 활동 기록 생성
async function createActivity(params: CreateActivityParams): Promise<Activity> {
  const response = await fetch('/api/activities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to create activity');
  }

  const data = await response.json();
  return data.activity;
}

/**
 * 최근 활동 목록을 가져오는 hook
 */
export function useActivities(limit = 20, module?: string) {
  return useQuery({
    queryKey: ['activities', { limit, module }],
    queryFn: () => fetchActivities(limit, module),
    refetchInterval: 30000, // 30초마다 자동 갱신
    staleTime: 10000, // 10초간 캐시 유지
  });
}

/**
 * 활동 기록을 생성하는 hook
 */
export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      // 활동 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

/**
 * 액션 텍스트 정규화 (영어 → 한글)
 */
export function normalizeActionText(action: string): string {
  const actionLower = action.toLowerCase();

  // 영어 → 한글 매핑
  const mappings: [string[], string][] = [
    [['download', 'export'], '다운로드'],
    [['upload'], '업로드'],
    [['create', 'add', 'new'], '생성'],
    [['update', 'edit', 'modify'], '수정'],
    [['delete', 'remove'], '삭제'],
    [['login', 'sign in'], '로그인'],
    [['logout', 'sign out'], '로그아웃'],
    [['view', 'read', 'get'], '조회'],
    [['send', 'publish'], '발송'],
    [['approve'], '승인'],
    [['reject'], '반려'],
    [['complete', 'finish'], '완료'],
  ];

  for (const [patterns, korean] of mappings) {
    if (patterns.some(p => actionLower === p || actionLower.includes(p))) {
      return korean;
    }
  }

  return action; // 매핑 없으면 원본 반환
}

/**
 * 상대 시간 표시 헬퍼 함수
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;

  return date.toLocaleDateString('ko-KR');
}