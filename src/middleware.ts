import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequestWithAuth } from 'next-auth/middleware';

/**
 * 예약된 경로 (테넌트 추출 제외)
 */
const RESERVED_PATHS = [
  'login',
  'api',
  '_next',
  'favicon.ico',
  'privacy',
  'terms',
  'test',
];

/**
 * 공개 경로 (인증 불필요)
 */
const PUBLIC_PATHS = ['login', 'privacy', 'terms'];

/**
 * URL 경로에서 테넌트 ID 추출
 */
function extractTenantId(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  const firstPart = parts[0];

  // 예약된 경로는 테넌트가 아님
  if (RESERVED_PATHS.includes(firstPart)) {
    return null;
  }

  return firstPart;
}

/**
 * 테넌트가 존재하는지 확인
 *
 * TODO: 프로덕션에서는 Redis 캐시 또는 config-loader 사용
 */
function validateTenant(tenantId: string): boolean {
  // 개발 환경: camp-* 형식 또는 demo 허용
  if (process.env.NODE_ENV === 'development') {
    return tenantId.startsWith('camp-') || tenantId === 'demo';
  }

  // 프로덕션: camp-* 형식만 허용
  return tenantId.startsWith('camp-');
}

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // 루트 경로: 로그인 페이지로 리다이렉트
    if (pathname === '/') {
      if (token?.tenantId) {
        // 인증된 사용자는 자신의 테넌트 대시보드로
        return NextResponse.redirect(new URL(`/${token.tenantId}`, req.url));
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // 테넌트 ID 추출
    const tenantId = extractTenantId(pathname);

    if (!tenantId) {
      // 예약된 경로는 그대로 통과
      return NextResponse.next();
    }

    // 테넌트 존재 확인
    const tenantExists = validateTenant(tenantId);
    if (!tenantExists) {
      return NextResponse.redirect(new URL('/login?error=invalid_tenant', req.url));
    }

    // 토큰의 tenantId와 URL의 tenantId 일치 확인
    if (token?.tenantId && token.tenantId !== tenantId) {
      // 다른 테넌트 접근 시도 → 로그인 페이지로
      return NextResponse.redirect(
        new URL(`/login?error=tenant_mismatch&tenant=${tenantId}`, req.url)
      );
    }

    // 요청 헤더에 테넌트 정보 주입
    const response = NextResponse.next();
    response.headers.set('X-Tenant-ID', tenantId);

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        const firstPart = pathname.split('/').filter(Boolean)[0];

        // 공개 경로는 인증 불필요
        if (firstPart && PUBLIC_PATHS.includes(firstPart)) {
          return true;
        }

        // 루트 경로는 인증 여부에 관계없이 통과 (미들웨어에서 리다이렉트 처리)
        if (pathname === '/') {
          return true;
        }

        // 그 외 경로는 인증 필요
        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

// 보호할 경로 지정 (로그인 페이지와 API, 정적 파일 제외)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (all API routes - 각 route에서 자체 인증 처리)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, public files, mockServiceWorker.js
     */
    '/((?!api|_next/static|_next/image|favicon\\.ico|mockServiceWorker\\.js|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp|.*\\.mp4|.*\\.m4a|.*\\.mp3).*)',
  ],
};
