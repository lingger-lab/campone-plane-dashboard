import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getTenantFromRequest } from '@/lib/api/tenant-helper';
import { authOptions } from '@/lib/auth';

// 알림 목록 조회 (테넌트 DB)
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
      take: limit * 2,
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
    const errorMessage =
      process.env.NODE_ENV === 'development' && error instanceof Error
        ? error.message
        : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// 알림 생성 (테넌트 DB + 시스템 DB에서 사용자 조회)
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-Service-Key');
    const isServiceCall = apiKey === process.env.INTERNAL_API_KEY;

    const session = await getServerSession(authOptions);

    if (!isServiceCall && session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { prisma, systemDb, tenantId } = await getTenantFromRequest();
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
      targetUserIds,
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'title and message are required' },
        { status: 400 }
      );
    }

    // 알림 생성 (테넌트 DB)
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
      // 현재 테넌트의 모든 활성 사용자 (시스템 DB 조회)
      const memberships = await systemDb.userTenant.findMany({
        where: { tenantId },
        include: {
          user: { select: { id: true, isActive: true } },
        },
      });
      userIds = memberships
        .filter((m) => m.user.isActive)
        .map((m) => m.userId);
    }

    // UserAlert 생성 (테넌트 DB)
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
