import { useState, useEffect } from 'react';

interface EmbedTokenResult {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEmbedToken(): EmbedTokenResult {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/embed-token');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '토큰을 가져올 수 없습니다.');
      }

      const data = await response.json();
      setToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();

    // 토큰 자동 갱신 (50분마다 - 만료 10분 전)
    const interval = setInterval(fetchToken, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { token, isLoading, error, refetch: fetchToken };
}

/**
 * 서비스 URL에 토큰을 추가하는 헬퍼 함수
 */
export function getEmbedUrl(baseUrl: string, token: string | null): string {
  if (!token) return baseUrl;

  const url = new URL(baseUrl);
  // /embed 경로로 리다이렉트하면서 토큰 전달
  url.pathname = '/embed';
  url.searchParams.set('token', token);
  return url.toString();
}