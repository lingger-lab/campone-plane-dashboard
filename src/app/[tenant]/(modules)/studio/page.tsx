'use client';

import React, { useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEmbedToken } from '@/hooks/useEmbedToken';
import { useTheme } from '@/components/theme-provider';

const STUDIO_URL = 'https://campone-studio-web-755458598444.asia-northeast3.run.app';

export default function StudioPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const { token, isLoading: tokenLoading, error: tokenError } = useEmbedToken();
  const { resolvedTheme } = useTheme();

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
    setIsLoading(true);
    setHasError(false);
  };

  // Studio는 ?embed=true&token=xxx 형식 사용
  const iframeSrc = token
    ? `${STUDIO_URL}?embed=true&token=${token}${resolvedTheme ? `&theme=${resolvedTheme}` : ''}`
    : STUDIO_URL;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* 툴바 */}
      <div className="flex items-center justify-between px-4 py-2 bg-background border-b shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-lg">Studio</h1>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            콘텐츠 제작 · 자동 배포
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
                {tokenLoading ? '인증 준비 중...' : 'Studio 모듈 로딩 중...'}
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
                  {tokenError || 'Studio 서비스에 연결하는 중 문제가 발생했습니다.'}
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
            key={iframeKey}
            src={iframeSrc}
            title="Studio Module"
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
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
