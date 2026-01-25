import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'success';
export type AlertType = 'system' | 'workflow';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  source?: string;
  pinned: boolean;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

interface AlertsResponse {
  alerts: Alert[];
  unreadCount: number;
}

interface CreateAlertParams {
  type?: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  source?: string;
  pinned?: boolean;
  expiresInMinutes?: number;
  targetUserIds?: string[];
}

// 알림 목록 조회
async function fetchAlerts(limit = 20, unreadOnly = false): Promise<AlertsResponse> {
  const params = new URLSearchParams();
  params.set('limit', limit.toString());
  if (unreadOnly) params.set('unread', 'true');

  const response = await fetch(`/api/alerts?${params}`);

  if (!response.ok) {
    throw new Error('Failed to fetch alerts');
  }

  return response.json();
}

// 알림 생성
async function createAlert(params: CreateAlertParams): Promise<Alert> {
  const response = await fetch('/api/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to create alert');
  }

  const data = await response.json();
  return data.alert;
}

// 알림 읽음 처리
async function markAlertAsRead(alertId: string): Promise<void> {
  const response = await fetch(`/api/alerts/${alertId}/read`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to mark alert as read');
  }
}

/**
 * 알림 목록을 가져오는 hook
 */
export function useAlerts(limit = 20, unreadOnly = false) {
  return useQuery({
    queryKey: ['alerts', { limit, unreadOnly }],
    queryFn: () => fetchAlerts(limit, unreadOnly),
    refetchInterval: 30000, // 30초마다 자동 갱신
    staleTime: 10000, // 10초간 캐시 유지
  });
}

/**
 * 읽지 않은 알림 개수만 가져오는 hook (헤더 배지용)
 */
export function useUnreadAlertCount() {
  const { data } = useAlerts(1, false);
  return data?.unreadCount ?? 0;
}

/**
 * 알림을 생성하는 hook
 */
export function useCreateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

/**
 * 알림을 읽음 처리하는 hook
 */
export function useMarkAlertAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAlertAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

/**
 * 알림 severity에 따른 스타일 클래스
 */
export function getAlertStyles(severity: AlertSeverity) {
  switch (severity) {
    case 'warning':
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        dot: 'bg-yellow-500',
        text: 'text-yellow-700 dark:text-yellow-300',
      };
    case 'error':
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        dot: 'bg-red-500',
        text: 'text-red-700 dark:text-red-300',
      };
    case 'success':
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        dot: 'bg-green-500',
        text: 'text-green-700 dark:text-green-300',
      };
    case 'info':
    default:
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        dot: 'bg-blue-500',
        text: 'text-blue-700 dark:text-blue-300',
      };
  }
}