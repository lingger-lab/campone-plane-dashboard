import { useState, useEffect } from 'react';

interface EmbedTokenResult {
  token: string | null;
  tenantId: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEmbedToken(): EmbedTokenResult {
  const [token, setToken] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = async (retryCount = 0) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/embed-token');

      if (!response.ok) {
        // 401이고 재시도 횟수 남아있으면 딜레이 후 재시도
        // (로그인 직후 세션 쿠키 전파 타이밍 이슈 대응)
        if (response.status === 401 && retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 800));
          return fetchToken(retryCount + 1);
        }
        const data = await response.json();
        throw new Error(data.message || '토큰을 가져올 수 없습니다.');
      }

      const data = await response.json();
      setToken(data.token);
      setTenantId(data.tenantId || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setToken(null);
      setTenantId(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();

    // 토큰 자동 갱신 (50분마다 - 만료 10분 전)
    const interval = setInterval(() => fetchToken(), 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { token, tenantId, isLoading, error, refetch: fetchToken };
}

export type ThemeType = 'light' | 'dark' | 'system';

/**
 * 서비스 URL에 토큰, 테넌트, 테마를 추가하는 헬퍼 함수
 */
export function getEmbedUrl(
  baseUrl: string,
  token: string | null,
  options?: {
    tenantId?: string | null;
    theme?: ThemeType;
  }
): string {
  if (!token) return baseUrl;

  const url = new URL(baseUrl);
  // /embed 경로로 리다이렉트하면서 토큰 전달
  url.pathname = '/embed';
  url.searchParams.set('token', token);

  // 테넌트 ID 전달
  if (options?.tenantId) {
    url.searchParams.set('tenant', options.tenantId);
  }

  // 테마 전달 (system인 경우 실제 적용된 테마로 변환)
  if (options?.theme) {
    url.searchParams.set('theme', options.theme);
  }

  return url.toString();
}