import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ModuleMessage,
  ALLOWED_ORIGINS,
  isValidModuleMessage,
  ActivityPayload,
  AlertPayload,
} from '@/lib/module-protocol';

interface UseModuleMessagesOptions {
  onActivity?: (source: string, payload: ActivityPayload) => void;
  onAlert?: (source: string, payload: AlertPayload) => void;
  onKpiUpdate?: (source: string, payload: Record<string, unknown>) => void;
  onReady?: (source: string) => void;
  onError?: (source: string, payload: Record<string, unknown>) => void;
}

/**
 * iframe 모듈들로부터 postMessage를 수신하고 처리하는 hook
 */
export function useModuleMessages(options: UseModuleMessagesOptions = {}) {
  const queryClient = useQueryClient();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // 활동 기록을 API로 전송
  const saveActivity = useCallback(
    async (source: string, payload: ActivityPayload) => {
      try {
        const response = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: payload.action,
            module: source,
            target: payload.target || payload.action,
            details: payload.details,
          }),
        });

        if (response.ok) {
          // 활동 목록 캐시 무효화 → 자동 리페치
          queryClient.invalidateQueries({ queryKey: ['activities'] });
        }
      } catch (error) {
        console.error('[Dashboard] Failed to save activity:', error);
      }
    },
    [queryClient]
  );

  // 알림을 API로 전송
  const saveAlert = useCallback(
    async (source: string, payload: AlertPayload) => {
      try {
        const response = await fetch('/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'workflow',
            severity: payload.severity,
            title: payload.title,
            message: payload.message,
            source,
            pinned: payload.pinned || false,
            expiresAt: payload.expiresInMinutes
              ? new Date(Date.now() + payload.expiresInMinutes * 60 * 1000).toISOString()
              : null,
          }),
        });

        if (response.ok) {
          // 알림 목록 캐시 무효화
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
        }
      } catch (error) {
        console.error('[Dashboard] Failed to save alert:', error);
      }
    },
    [queryClient]
  );

  // KPI 데이터를 API로 전송
  const saveKpi = useCallback(
    async (source: string, payload: Record<string, unknown>) => {
      try {
        const response = await fetch('/api/kpi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            module: source,
            key: payload.key,
            value: payload.value,
            unit: payload.unit,
            change: payload.change,
            expiresInMinutes: payload.expiresInMinutes || 60,
          }),
        });

        if (response.ok) {
          // KPI 캐시 무효화
          queryClient.invalidateQueries({ queryKey: ['kpi'] });
          // 개별 KPI 캐시도 업데이트
          queryClient.setQueryData(['kpi', source, payload.key], payload);
        }
      } catch (error) {
        console.error('[Dashboard] Failed to save KPI:', error);
      }
    },
    [queryClient]
  );

  // 메시지 핸들러
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Origin 검증
      if (!ALLOWED_ORIGINS.includes(event.origin)) {
        // 로컬 개발 환경에서는 모든 localhost 허용
        if (!event.origin.startsWith('http://localhost:')) {
          console.warn('[Dashboard] Rejected message from:', event.origin);
          return;
        }
      }

      // 메시지 형식 검증
      if (!isValidModuleMessage(event.data)) {
        // React DevTools 등 다른 메시지는 무시
        return;
      }

      const message = event.data as ModuleMessage;
      console.log(`[Dashboard] Received from ${message.source}:`, message);

      switch (message.type) {
        case 'ACTIVITY':
          saveActivity(message.source, message.payload as ActivityPayload);
          optionsRef.current.onActivity?.(message.source, message.payload as ActivityPayload);
          break;

        case 'ALERT':
          saveAlert(message.source, message.payload as AlertPayload);
          optionsRef.current.onAlert?.(message.source, message.payload as AlertPayload);
          break;

        case 'KPI_UPDATE':
          // KPI 데이터를 DB에 저장하고 캐시 업데이트
          saveKpi(message.source, message.payload as Record<string, unknown>);
          optionsRef.current.onKpiUpdate?.(
            message.source,
            message.payload as Record<string, unknown>
          );
          break;

        case 'READY':
          console.log(`[Dashboard] Module ${message.source} is ready`);
          optionsRef.current.onReady?.(message.source);
          break;

        case 'ERROR':
          console.error(`[Dashboard] Error from ${message.source}:`, message.payload);
          optionsRef.current.onError?.(
            message.source,
            message.payload as Record<string, unknown>
          );
          break;

        case 'NAVIGATION':
          // 네비게이션 요청 처리 (필요시 구현)
          break;
      }
    },
    [saveActivity, saveAlert, saveKpi, queryClient]
  );

  // 이벤트 리스너 등록
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    console.log('[Dashboard] Module message listener registered');

    return () => {
      window.removeEventListener('message', handleMessage);
      console.log('[Dashboard] Module message listener removed');
    };
  }, [handleMessage]);
}