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
 * 모듈 코드 → 한글 표시명 정규화
 *
 * 서비스별 모듈명 형식이 다양함:
 * - 대문자: "Ops", "Hub", "Policy", "Studio", "Insights"
 * - 소문자: "ops", "hub", "policy", "studio", "insights"
 * - 별칭: "Pulse" (Insights의 라우트명), "civichub"
 */
export function normalizeModuleName(module: string): string {
  if (!module) return '';

  const moduleLower = module.toLowerCase().trim();

  const moduleMap: Record<string, string> = {
    ops: '운영',
    hub: '시민소통',
    civichub: '시민소통',
    'civic hub': '시민소통',
    'civic-hub': '시민소통',
    policy: '정책',
    'policy lab': '정책',
    'policy-lab': '정책',
    studio: '스튜디오',
    insights: '여론분석',
    pulse: '여론분석',
    dashboard: '대시보드',
    system: '시스템',
  };

  if (moduleMap[moduleLower]) {
    return moduleMap[moduleLower];
  }

  // 이미 한글이면 그대로
  if (/[가-힣]/.test(module)) {
    return module;
  }

  return module;
}

/**
 * 알림 severity → 한글 라벨
 */
export function normalizeSeverity(severity: string): string {
  const map: Record<string, string> = {
    info: '정보',
    warning: '주의',
    error: '오류',
    success: '성공',
    critical: '긴급',
  };
  return map[severity?.toLowerCase()] || severity;
}

/**
 * 액션 텍스트 정규화 (영어/dot-notation → 한글)
 *
 * 서비스별 액션 형식:
 * - Ops: dot-notation (task.created, schedule.changed)
 * - Hub 서버: dot-notation (question.approved, ticket.resolved)
 * - Hub 클라이언트: 한글 (승인, 반려)
 * - Policy: 혼용 (update, 분석 완료)
 * - Insights: 한글 (분석 시작, 분석 완료)
 */
export function normalizeActionText(action: string): string {
  const actionLower = action.toLowerCase();

  // 1. 정확한 dot-notation 매핑 (우선)
  const exactMappings: Record<string, string> = {
    'task.created': '업무 생성',
    'task.updated': '업무 수정',
    'task.deleted': '업무 삭제',
    'task.pending': '업무 대기',
    'task.started': '업무 시작',
    'task.reviewing': '업무 검토',
    'task.completed': '업무 완료',
    'schedule.created': '일정 생성',
    'schedule.changed': '일정 변경',
    'schedule.deleted': '일정 삭제',
    'checklist.created': '체크리스트 생성',
    'checklist.updated': '체크리스트 수정',
    'checklist.deleted': '체크리스트 삭제',
    'question.approved': '질문 승인',
    'question.rejected': '질문 반려',
    'inquiry.responded': '문의 답변',
    'ticket.resolved': '티켓 처리',
    'feedback.received': '피드백 접수',
    'policy.analyzed': '정책 분석',
    'policy.analysis_failed': '분석 실패',
    'policy.updated': '정책 수정',
    'policy.uploaded': '정책 업로드',
    'strategy.generated': '전략 생성',
    'strategy.failed': '전략 실패',
    'analysis.completed': '분석 완료',
    'analysis.failed': '분석 실패',
    'analysis.partial_completed': '부분 분석 완료',
  };

  if (exactMappings[actionLower]) {
    return exactMappings[actionLower];
  }

  // 2. 이미 한글이면 그대로 반환
  if (/[가-힣]/.test(action)) {
    return action;
  }

  // 3. 단순 영어 키워드 매핑 (fallback)
  const keywordMappings: [string[], string][] = [
    [['download', 'export'], '다운로드'],
    [['upload', 'import'], '업로드'],
    [['create', 'add', 'new'], '생성'],
    [['update', 'edit', 'modify', 'change'], '수정'],
    [['delete', 'remove'], '삭제'],
    [['login', 'sign in'], '로그인'],
    [['logout', 'sign out'], '로그아웃'],
    [['view', 'read', 'get'], '조회'],
    [['send', 'publish'], '발송'],
    [['approve'], '승인'],
    [['reject'], '반려'],
    [['complete', 'finish', 'resolve'], '완료'],
    [['respond', 'reply'], '답변'],
    [['receive'], '접수'],
    [['start', 'begin'], '시작'],
    [['cancel'], '취소'],
    [['analyze', 'analys'], '분석'],
    [['generate'], '생성'],
    [['fail', 'error'], '실패'],
  ];

  for (const [patterns, korean] of keywordMappings) {
    if (patterns.some(p => actionLower === p || actionLower.includes(p))) {
      return korean;
    }
  }

  return action;
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