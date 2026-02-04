import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getTenantFromRequest } from '@/lib/api/tenant-helper';
import { authOptions } from '@/lib/auth';

// KPI 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prisma } = await getTenantFromRequest();
    const { searchParams } = new URL(request.url);
    const moduleName = searchParams.get('module');
    const key = searchParams.get('key');

    // 만료되지 않은 KPI만 조회
    const now = new Date();

    const where: Record<string, unknown> = {
      expiresAt: { gt: now },
    };

    if (moduleName && key) {
      // 특정 모듈의 특정 KPI
      where.key = `${moduleName}:${key}`;
    } else if (moduleName) {
      // 특정 모듈의 모든 KPI
      where.key = { startsWith: `${moduleName}:` };
    }

    const kpiData = await prisma.kpiCache.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    // 키에서 모듈 prefix 분리해서 반환
    const formattedData = kpiData.map((item) => {
      const [itemModule, ...keyParts] = item.key.split(':');
      return {
        module: itemModule,
        key: keyParts.join(':'),
        value: item.value,
        expiresAt: item.expiresAt,
        updatedAt: item.updatedAt,
      };
    });

    return NextResponse.json({ kpi: formattedData });
  } catch (error) {
    console.error('Failed to fetch KPI data:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// KPI 데이터 저장/업데이트
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);

    // 서비스 간 통신용 API 키 확인
    const apiKey = request.headers.get('X-Service-Key');
    const isServiceCall = apiKey === process.env.INTERNAL_API_KEY;

    // postMessage에서 온 요청은 세션 없이도 허용 (내부 API 호출)
    const isInternalCall = request.headers.get('X-Internal-Call') === 'true';

    if (!session?.user && !isServiceCall && !isInternalCall) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prisma } = await getTenantFromRequest();
    const body = await request.json();
    const { module: moduleName, key, value, unit, change, expiresInMinutes } = body;

    if (!moduleName || !key) {
      return NextResponse.json(
        { error: 'module and key are required' },
        { status: 400 }
      );
    }

    // 복합 키 생성 (module:key)
    const compositeKey = `${moduleName}:${key}`;

    // 만료 시간 계산 (기본 1시간)
    const expiresAt = new Date(
      Date.now() + (expiresInMinutes || 60) * 60 * 1000
    );

    // upsert: 있으면 업데이트, 없으면 생성
    const kpi = await prisma.kpiCache.upsert({
      where: { key: compositeKey },
      update: {
        value: { value, unit, change },
        expiresAt,
      },
      create: {
        key: compositeKey,
        value: { value, unit, change },
        expiresAt,
      },
    });

    return NextResponse.json(
      {
        success: true,
        kpi: {
          module: moduleName,
          key,
          value: kpi.value,
          expiresAt: kpi.expiresAt,
          updatedAt: kpi.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to save KPI data:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// KPI 데이터 삭제 (만료된 데이터 정리용)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prisma } = await getTenantFromRequest();
    const { searchParams } = new URL(request.url);
    const cleanExpired = searchParams.get('expired') === 'true';

    if (cleanExpired) {
      // 만료된 KPI 데이터 삭제
      const result = await prisma.kpiCache.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      return NextResponse.json({
        success: true,
        deletedCount: result.count,
      });
    }

    return NextResponse.json(
      { error: 'Specify action: expired=true' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to delete KPI data:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
