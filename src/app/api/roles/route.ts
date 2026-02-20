import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getTenantFromRequest } from '@/lib/api/tenant-helper';
import { authOptions } from '@/lib/auth';

const ROLE_INFO: Record<string, { label: string; description: string }> = {
  admin: { label: '관리자', description: '모든 기능에 대한 전체 권한 (설정, 사용자 관리 포함)' },
  editor: { label: '편집자', description: '콘텐츠 및 설정 편집 권한 (사용자 관리 제외)' },
  viewer: { label: '뷰어', description: '읽기 전용 (대시보드 조회만 가능)' },
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { systemDb, tenantId } = await getTenantFromRequest();

    // 현재 테넌트의 역할별 사용자 수 집계
    const roleCounts = await systemDb.userTenant.groupBy({
      by: ['role'],
      _count: { role: true },
      where: { tenantId },
    });

    const countMap = new Map(
      roleCounts.map((rc) => [rc.role, rc._count.role])
    );

    const roles = Object.entries(ROLE_INFO).map(([key, info]) => ({
      key,
      label: info.label,
      description: info.description,
      count: countMap.get(key) || 0,
    }));

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
