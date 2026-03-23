'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

const PUBLIC_PATHS = ['/login', '/privacy', '/terms'];

/**
 * 세션 만료를 감지하여 자동으로 로그인 페이지로 리다이렉트합니다.
 *
 * 감지 방법:
 * 1. SessionProvider의 refetchInterval로 주기적 세션 체크 (1분)
 * 2. useSession status가 unauthenticated로 변경 시 즉시 리다이렉트
 * 3. fetch 응답 401 감지 (API 호출 실패 시 즉시 리다이렉트)
 */
export function SessionGuard() {
  const { status } = useSession();
  const pathname = usePathname();
  const wasAuthenticated = useRef(false);
  const redirecting = useRef(false);

  const redirectToLogin = useCallback(() => {
    if (redirecting.current) return;
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return;

    redirecting.current = true;
    window.location.href = '/login';
  }, [pathname]);

  // 세션 status 변화 감지
  useEffect(() => {
    if (status === 'authenticated') {
      wasAuthenticated.current = true;
    }

    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
      return;
    }

    // 이전에 인증되었다가 만료된 경우 → 자동 리다이렉트
    if (status === 'unauthenticated' && wasAuthenticated.current) {
      wasAuthenticated.current = false;
      redirectToLogin();
    }
  }, [status, pathname, redirectToLogin]);

  // fetch 401 응답 감지 — API 호출 시 세션 만료를 즉시 감지
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      // 401 응답이고, /api/ 경로 요청인 경우 (세션 체크 API 제외)
      if (response.status === 401 && wasAuthenticated.current) {
        const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : '';
        // next-auth 세션 체크 API는 제외 (무한 루프 방지)
        if (url.includes('/api/') && !url.includes('/api/auth/')) {
          redirectToLogin();
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [redirectToLogin]);

  return null;
}
