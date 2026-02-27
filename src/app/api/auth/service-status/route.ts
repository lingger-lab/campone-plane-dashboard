import { NextResponse } from 'next/server';
import { checkMaintenance } from '@/lib/service-guard';

/**
 * GET /api/auth/service-status
 *
 * 대시보드 서비스 점검 상태 확인 (인증 불필요).
 * 로그인 페이지에서 사전 체크용으로 사용.
 */
export async function GET() {
  try {
    const status = await checkMaintenance();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Service status check failed:', error);
    return NextResponse.json({ maintenance: false, message: '' });
  }
}
