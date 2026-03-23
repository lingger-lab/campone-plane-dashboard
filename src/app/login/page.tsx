'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackUrl = searchParams.get('callbackUrl') || '';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // URL에서 stale 파라미터 정리 (tenant, error 등 제거)
  useEffect(() => {
    const hasStaleParams =
      searchParams.get('tenant') || searchParams.get('error');
    if (hasStaleParams) {
      // 에러 메시지 설정 후 URL 파라미터 제거 (callbackUrl만 보존)
      const cleanUrl = callbackUrl
        ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
        : '/login';
      window.history.replaceState(null, '', cleanUrl);
    }
  }, [searchParams, callbackUrl]);

  // URL 에러 파라미터 처리
  useEffect(() => {
    if (errorParam === 'invalid_tenant') {
      setError('유효하지 않은 캠프입니다.');
    } else if (errorParam === 'tenant_mismatch') {
      setError('다른 캠프에 접근 권한이 없습니다.');
    } else if (errorParam === 'maintenance') {
      setError('서비스 점검 중입니다. 잠시 후 다시 시도해주세요.');
    } else if (errorParam === 'tenant_inactive') {
      setError('현재 서비스가 중지된 상태입니다. 관리자에게 문의하세요.');
    } else if (errorParam === 'service_disabled') {
      setError('이 캠프에서는 대시보드 서비스를 사용할 수 없습니다.');
    }
  }, [errorParam]);

  // 페이지 로드 시 점검 모드 확인 (경고 배너용 — 로그인 자체는 차단하지 않음)
  useEffect(() => {
    fetch('/api/auth/service-status')
      .then((res) => res.json())
      .then((status) => {
        if (status.maintenance) {
          setMaintenanceMessage(
            status.message || '서비스 점검 중입니다. 잠시 후 다시 시도해주세요.'
          );
        }
        if (status.notice) {
          setNoticeMessage(status.notice);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // 점검 중 로그인 실패 → 점검 안내 (시스템 관리자만 우회 가능)
        if (maintenanceMessage) {
          setError('서비스 점검 중입니다. 시스템 관리자만 로그인할 수 있습니다.');
        } else {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
      } else {
        // 로그인 성공 → 세션에서 tenantId 가져와서 리다이렉트
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        const tenantId = session?.user?.tenantId;

        const redirectUrl = callbackUrl || (tenantId ? `/${tenantId}` : '/');
        router.push(redirectUrl);
        router.refresh();
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full space-y-8">
      {/* Logo & Title */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Image
            src="/camponelogo.svg"
            alt="CampOne Logo"
            width={80}
            height={80}
            className="dark:invert"
          />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          CampOne 관리자
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          관리자 계정으로 로그인하세요
        </p>
      </div>

      {/* 점검 모드 경고 배너 */}
      {maintenanceMessage && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            {maintenanceMessage}
          </p>
        </div>
      )}

      {/* 점검 예고 배너 */}
      {noticeMessage && !maintenanceMessage && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
            {noticeMessage}
          </p>
        </div>
      )}

      {/* Login Form */}
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="rounded-md shadow-sm space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="admin@campone.kr"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="••••••••"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              로그인 중...
            </span>
          ) : (
            '로그인'
          )}
        </button>

        {/* Demo Credentials Info (개발 환경에서만 표시) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">
              테스트 계정 (비밀번호: campone123!)
            </p>
            <div className="space-y-1">
              <p className="text-xs text-blue-500 dark:text-blue-300">
                <span className="font-medium">관리자:</span> admin@campone.kr
              </p>
              <p className="text-xs text-blue-500 dark:text-blue-300">
                <span className="font-medium">분석가:</span> analyst@campone.kr
              </p>
              <p className="text-xs text-blue-500 dark:text-blue-300">
                <span className="font-medium">멤버:</span> member@campone.kr
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

function LoginSkeleton() {
  return (
    <div className="max-w-md w-full space-y-8 animate-pulse">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto mt-2" />
      </div>
      <div className="space-y-4">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-12 bg-primary/50 rounded" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<LoginSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
