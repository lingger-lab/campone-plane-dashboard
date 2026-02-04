import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * 루트 페이지
 *
 * - 인증된 사용자: 자신의 테넌트 대시보드로 리다이렉트
 * - 미인증 사용자: 로그인 페이지로 리다이렉트
 */
export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.tenantId) {
    // 인증된 사용자는 자신의 테넌트로
    redirect(`/${session.user.tenantId}`);
  }

  // 미인증 사용자는 로그인으로
  redirect('/login');
}
