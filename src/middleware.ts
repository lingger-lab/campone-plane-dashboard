import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // 인증된 사용자만 접근 가능
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
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
     * - login (login page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, public files, mockServiceWorker.js
     */
    '/((?!api|login|_next/static|_next/image|favicon\\.ico|mockServiceWorker\\.js|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp|.*\\.mp4|.*\\.m4a|.*\\.mp3).*)',
  ],
};
