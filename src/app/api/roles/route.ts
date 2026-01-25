import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

const ROLE_INFO = {
  Admin: { label: '관리자', description: '모든 기능에 대한 전체 권한' },
  Manager: { label: '매니저', description: '역할/권한 관리 제외 대부분 권한' },
  Staff: { label: '스태프', description: '일부 기능에 대한 제한된 권한' },
  Viewer: { label: '뷰어', description: '읽기 전용 권한' },
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 역할별 사용자 수 집계
    const roleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
      where: { isActive: true },
    });

    const countMap = new Map(
      roleCounts.map((rc) => [rc.role, rc._count.role])
    );

    const roles = Object.entries(ROLE_INFO).map(([key, info]) => ({
      key,
      label: info.label,
      description: info.description,
      count: countMap.get(key as keyof typeof ROLE_INFO) || 0,
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
