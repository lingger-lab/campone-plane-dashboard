import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getTenantFromRequest } from '@/lib/api/tenant-helper';
import { authOptions } from '@/lib/auth';

// 활동 목록 조회 (시스템 DB - audit_logs)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { systemDb, tenantId } = await getTenantFromRequest();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const auditLogs = await systemDb.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        actor: {
          select: { name: true, email: true },
        },
      },
    });

    const activities = auditLogs.map((log) => ({
      id: log.id,
      userName: log.actor?.name || 'System',
      action: log.action,
      module: (log.detail as Record<string, unknown>)?.module || null,
      target: log.resource,
      details: log.detail,
      createdAt: log.createdAt,
    }));

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// 활동 기록 생성 (시스템 DB - audit_logs)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // 서비스 간 통신용 API 키 확인
    const apiKey = request.headers.get('X-Service-Key');
    const isServiceCall = apiKey === process.env.INTERNAL_API_KEY;

    if (!session?.user && !isServiceCall) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { systemDb, tenantId } = await getTenantFromRequest();
    const body = await request.json();
    const { action, module: moduleName, target, details, userId } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      );
    }

    const actorId = session?.user?.id || userId || null;

    const activity = await systemDb.auditLog.create({
      data: {
        actorId,
        tenantId,
        action,
        resource: target || moduleName,
        detail: { module: moduleName, ...details },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      },
    });

    return NextResponse.json({ success: true, activity }, { status: 201 });
  } catch (error) {
    console.error('Failed to create activity:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
