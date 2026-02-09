import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getTenantFromRequest } from '@/lib/api/tenant-helper';
import { isValidServiceKey } from '@/lib/api/service-auth';
import { authOptions } from '@/lib/auth';
import { getSystemPrisma } from '@/lib/prisma';

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
// 인증: 세션 또는 X-Service-Key (다른 서비스에서 호출 시)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // 서비스 간 통신용 API 키 확인
    const isServiceCall = isValidServiceKey(request.headers.get('x-service-key'));

    if (!session?.user && !isServiceCall) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 서비스 호출 시 X-Tenant-Id에서 tenantId 추출
    const serviceTenantId = request.headers.get('x-tenant-id');
    const { systemDb, tenantId: sessionTenantId } = await getTenantFromRequest().catch(() => ({
      systemDb: null,
      tenantId: null,
    }));
    const tenantId = serviceTenantId || sessionTenantId;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required (session or X-Tenant-Id header)' },
        { status: 400 }
      );
    }

    // systemDb가 없으면 직접 가져오기
    const db = systemDb || getSystemPrisma();

    const body = await request.json();
    const { action, module: moduleName, target, details, userId } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      );
    }

    const actorId = session?.user?.id || userId || null;

    const activity = await db.auditLog.create({
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
