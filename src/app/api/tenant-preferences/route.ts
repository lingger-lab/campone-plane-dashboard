import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getTenantFromRequest } from '@/lib/api/tenant-helper';
import { authOptions } from '@/lib/auth';
import { canEdit } from '@/lib/rbac';

// 테넌트 환경설정 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prisma } = await getTenantFromRequest();
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'key parameter is required' }, { status: 400 });
    }

    const pref = await prisma.tenantPreference.findUnique({
      where: { key },
    });

    if (!pref) {
      return NextResponse.json({ key, value: null });
    }

    return NextResponse.json({ key: pref.key, value: pref.value });
  } catch (error) {
    console.error('Failed to fetch tenant preference:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 테넌트 환경설정 저장
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role || 'viewer';
    if (!canEdit(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { prisma } = await getTenantFromRequest();
    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }

    const pref = await prisma.tenantPreference.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json({ success: true, key: pref.key, value: pref.value });
  } catch (error) {
    console.error('Failed to save tenant preference:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
