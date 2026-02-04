import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getTenantFromRequest } from '@/lib/api/tenant-helper';
import { authOptions } from '@/lib/auth';

// 알림 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prisma } = await getTenantFromRequest();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unread') === 'true';

    // 사용자별 알림 조회 (UserAlert join)
    const userAlerts = await prisma.userAlert.findMany({
      where: {
        userId: session.user.id,
        ...(unreadOnly ? { read: false } : {}),
      },
      include: {
        alert: true,
      },
      take: limit * 2, // 만료된 것 필터링 후에도 충분히 남도록
    });

    // 만료되지 않은 알림만 필터링, 정렬, limit 적용
    const now = new Date();
    const alerts = userAlerts
      .filter((ua) => !ua.alert.expiresAt || ua.alert.expiresAt > now)
      .sort((a, b) => b.alert.createdAt.getTime() - a.alert.createdAt.getTime())
      .slice(0, limit)
      .map((ua) => ({
        id: ua.alert.id,
        type: ua.alert.type,
        severity: ua.alert.severity,
        title: ua.alert.title,
        message: ua.alert.message,
        source: ua.alert.source,
        pinned: ua.alert.pinned,
        read: ua.read,
        readAt: ua.readAt,
        createdAt: ua.alert.createdAt,
      }));

    // 읽지 않은 알림 수
    const unreadCount = await prisma.userAlert.count({
      where: {
        userId: session.user.id,
        read: false,
      },
    });

    return NextResponse.json({ alerts, unreadCount });
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    // 개발 환경에서 더 자세한 에러 정보 제공
    const errorMessage =
      process.env.NODE_ENV === 'development' && error instanceof Error
        ? error.message
        : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// 알림 생성 (시스템 또는 모듈에서 호출)
export async function POST(request: NextRequest) {
  try {
    // 서비스 간 통신용 API 키 확인
    const apiKey = request.headers.get('X-Service-Key');
    const isServiceCall = apiKey === process.env.INTERNAL_API_KEY;

    // 세션 확인
    const session = await getServerSession(authOptions);

    // Admin 또는 서비스 호출만 알림 생성 가능
    if (!isServiceCall && session?.user?.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { prisma } = await getTenantFromRequest();
    const body = await request.json();
    const {
      type = 'system',
      severity = 'info',
      title,
      message,
      source,
      sourceId,
      pinned = false,
      expiresAt,
      targetUserIds, // 특정 사용자들에게만 알림 (없으면 전체)
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'title and message are required' },
        { status: 400 }
      );
    }

    // 알림 생성
    const alert = await prisma.alert.create({
      data: {
        type,
        severity,
        title,
        message,
        source,
        sourceId,
        pinned,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    // 대상 사용자 결정
    let userIds: string[] = [];

    if (targetUserIds && targetUserIds.length > 0) {
      userIds = targetUserIds;
    } else {
      // 전체 활성 사용자에게 알림
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    }

    // UserAlert 생성 (각 사용자별)
    if (userIds.length > 0) {
      await prisma.userAlert.createMany({
        data: userIds.map((userId) => ({
          userId,
          alertId: alert.id,
          read: false,
        })),
      });
    }

    return NextResponse.json(
      { success: true, alert, notifiedUsers: userIds.length },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create alert:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}