import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getTenantFromRequest } from '@/lib/api/tenant-helper';
import { authOptions } from '@/lib/auth';

// 알림 읽음 처리
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prisma } = await getTenantFromRequest();
    const alertId = params.id;

    // 해당 사용자의 알림만 업데이트
    const updated = await prisma.userAlert.updateMany({
      where: {
        userId: session.user.id,
        alertId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: 'Alert not found or already read' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to mark alert as read:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}