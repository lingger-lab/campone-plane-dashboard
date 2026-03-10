import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getTenantFromRequest, safeParseLimit, safeParseJson, handleRouteError } from '@/lib/api/tenant-helper';
import { isValidServiceKey } from '@/lib/api/service-auth';
import { authOptions } from '@/lib/auth';

// 활동 목록 조회 (테넌트 DB - activities)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prisma } = await getTenantFromRequest();
    const { searchParams } = new URL(request.url);
    const limit = safeParseLimit(searchParams.get('limit'));

    const records = await prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const activities = records.map((r) => ({
      id: r.id,
      userName: r.userName || 'System',
      action: r.action,
      module: r.module,
      target: r.target,
      details: r.detail,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({ activities });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch activities:');
  }
}

// 활동 기록 생성 (테넌트 DB - activities)
// 인증: 세션 또는 X-Service-Key (다른 서비스에서 호출 시)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isServiceCall = isValidServiceKey(request.headers.get('x-service-key'));

    if (!session?.user && !isServiceCall) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prisma } = await getTenantFromRequest();

    const body = await safeParseJson(request);
    if (body instanceof Response) return body;
    const { action, module: moduleName, target, details, userId, userName } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    const activity = await prisma.activity.create({
      data: {
        userId: session?.user?.id || userId || null,
        userName: (session?.user as { name?: string })?.name || userName || 'System',
        action,
        module: moduleName,
        target: target || moduleName,
        detail: details || undefined,
      },
    });

    return NextResponse.json({ success: true, activity }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'Failed to create activity:');
  }
}
