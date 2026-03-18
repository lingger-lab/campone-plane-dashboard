'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEmbedToken, getEmbedUrl, ThemeType } from '@/hooks/useEmbedToken';
import { useTheme } from '@/components/theme-provider';
import { useTenant } from '@/lib/tenant/TenantContext';
import { ALLOWED_ORIGINS } from '@/lib/module-protocol';

interface EmbedIframeProps {
  /** 모듈 표시 이름 */
  title: string;
  /** 부제목 */
  subtitle: string;
  /** 서비스 키 (config.services에서 가져올 키) */
  serviceKey: 'insights' | 'studio' | 'policy' | 'ops' | 'hub';
  /** iframe title 속성 */
  iframeTitle?: string;
}

/** READY 메시지 대기 타임아웃 (ms) */
const READY_TIMEOUT = 10_000;
/** 최대 자동 재시도 횟수 */
const MAX_AUTO_RETRY = 1;

export function EmbedIframe({ title, subtitle, serviceKey, iframeTitle }: EmbedIframeProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [autoRetryCount, setAutoRetryCount] = useState(0);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyReceived = useRef(false);

  const { token, tenantId: tokenTenantId, isLoading: tokenLoading, error: tokenError, refetch } = useEmbedToken();
  const { resolvedTheme } = useTheme();
  const { tenantId, config } = useTenant();

  const serviceUrl = config.services[serviceKey];

  // iframe URL 생성
  const iframeSrc = token
    ? getEmbedUrl(serviceUrl, token, {
        tenantId: tenantId || tokenTenantId,
        theme: resolvedTheme as ThemeType,
      })
    : serviceUrl;

  // postMessage로 토큰 전달 (서드파티 쿠키 우회)
  const sendTokenViaPostMessage = useCallback(() => {
    if (!iframeRef.current?.contentWindow || !token) return;
    iframeRef.current.contentWindow.postMessage(
      {
        type: 'AUTH_TOKEN',
        source: 'Dashboard',
        timestamp: Date.now(),
        payload: {
          token,
          tenantId: tenantId || tokenTenantId,
          theme: resolvedTheme,
        },
      },
      new URL(serviceUrl).origin
    );
  }, [token, tenantId, tokenTenantId, resolvedTheme, serviceUrl]);

  // READY 메시지 리스너
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // origin 확인
      if (!ALLOWED_ORIGINS.includes(event.origin)) return;

      const data = event.data;
      if (!data || typeof data !== 'object') return;

      // READY 메시지 수신 → 로딩 완료
      if (data.type === 'READY') {
        readyReceived.current = true;
        setIsLoading(false);
        setHasError(false);
        if (readyTimerRef.current) {
          clearTimeout(readyTimerRef.current);
          readyTimerRef.current = null;
        }
      }

      // AUTH_REQUIRED 메시지 → postMessage로 토큰 재전달
      if (data.type === 'AUTH_REQUIRED') {
        sendTokenViaPostMessage();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sendTokenViaPostMessage]);

  // iframe onLoad 핸들러
  const handleIframeLoad = useCallback(() => {
    // iframe 로드 직후 postMessage로도 토큰 전달 (쿠키 우회)
    setTimeout(() => sendTokenViaPostMessage(), 300);

    // READY 타임아웃: READY가 안 오면 자동 재시도
    readyReceived.current = false;
    if (readyTimerRef.current) clearTimeout(readyTimerRef.current);

    readyTimerRef.current = setTimeout(() => {
      if (!readyReceived.current) {
        // READY 안 옴 → 자동 재시도 (최대 1회)
        if (autoRetryCount < MAX_AUTO_RETRY) {
          setAutoRetryCount((c) => c + 1);
          setIframeKey((k) => k + 1);
          refetch();
        } else {
          // 재시도 소진 → 그냥 로딩 해제 (iframe은 나름대로 표시됨)
          setIsLoading(false);
        }
      }
    }, READY_TIMEOUT);
  }, [sendTokenViaPostMessage, autoRetryCount, refetch]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (readyTimerRef.current) clearTimeout(readyTimerRef.current);
    };
  }, []);

  // 수동 새로고침
  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
    setIsLoading(true);
    setHasError(false);
    setAutoRetryCount(0);
    readyReceived.current = false;
    refetch();
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* 툴바 */}
      <div className="flex items-center justify-between px-4 py-2 bg-background border-b shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-lg">{title}</h1>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {subtitle}
          </span>
          {(isLoading || tokenLoading) && (
            <span className="text-xs text-blue-600 animate-pulse">로딩 중...</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          title="새로고침"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* iframe 영역 */}
      <div className="flex-1 relative bg-muted">
        {/* 로딩 오버레이 */}
        {(isLoading || tokenLoading) && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                {tokenLoading ? '인증 준비 중...' : `${title} 모듈 로딩 중...`}
              </span>
            </div>
          </div>
        )}

        {/* 에러 상태 */}
        {(hasError || tokenError) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="flex flex-col items-center gap-4 text-center px-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <p className="font-medium">연결할 수 없습니다</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {tokenError || `${title} 서비스에 연결하는 중 문제가 발생했습니다.`}
                </p>
              </div>
              <Button onClick={handleRefresh} variant="outline" size="sm">
                다시 시도
              </Button>
            </div>
          </div>
        )}

        {!tokenLoading && token && (
          <iframe
            ref={iframeRef}
            key={iframeKey}
            src={iframeSrc}
            title={iframeTitle || `${title} Module`}
            className="w-full h-full border-0"
            onLoad={handleIframeLoad}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            allow="clipboard-write; clipboard-read"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
          />
        )}
      </div>
    </div>
  );
}
