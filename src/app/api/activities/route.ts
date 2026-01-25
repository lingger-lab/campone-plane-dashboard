import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// 활동 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const moduleFilter = searchParams.get('module'); // 특정 모듈만 필터링

    const where = moduleFilter ? { module: moduleFilter } : {};

    const activities = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        userName: true,
        action: true,
        module: true,
        target: true,
        details: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// 활동 기록 생성
export async function POST(request: NextRequest) {
  try {
    // 인증 확인 (세션 또는 embed 토큰)
    const session = await getServerSession(authOptions);

    // 서비스 간 통신용 API 키 확인
    const apiKey = request.headers.get('X-Service-Key');
    const isServiceCall = apiKey === process.env.INTERNAL_API_KEY;

    if (!session?.user && !isServiceCall) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, module: moduleName, target, details, userId, userName } = body;

    if (!action || !moduleName) {
      return NextResponse.json(
        { error: 'action and module are required' },
        { status: 400 }
      );
    }

    // 사용자 정보 결정 (세션 우선, 없으면 body에서)
    const finalUserId = session?.user?.id || userId;
    const finalUserName = session?.user?.name || userName || 'System';

    if (!finalUserId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const activity = await prisma.auditLog.create({
      data: {
        userId: finalUserId,
        userName: finalUserName,
        action,
        module: moduleName,
        target: target || action,
        details: details || null,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
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