import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantFromRequest, safeParseJson, handleRouteError, isSafeUrl } from '@/lib/api/tenant-helper';
import { canEdit } from '@/lib/rbac';

// GET: 퀵버튼 목록 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prisma } = await getTenantFromRequest();
    const buttons = await prisma.quickButton.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ buttons });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch quick buttons:');
  }
}

// POST: 퀵버튼 생성 (권한 필요: Admin, Manager)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role || 'viewer';

    if (!canEdit(userRole)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { prisma } = await getTenantFromRequest();
    const body = await safeParseJson(request);
    if (body instanceof Response) return body;
    const { label, url, icon, category, order } = body;

    if (!label || !url) {
      return NextResponse.json({ error: 'label and url are required' }, { status: 400 });
    }

    if (!isSafeUrl(url)) {
      return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 });
    }

    // order가 없으면 마지막에 추가
    let newOrder = order;
    if (newOrder === undefined) {
      const lastButton = await prisma.quickButton.findFirst({
        orderBy: { order: 'desc' },
      });
      newOrder = (lastButton?.order ?? -1) + 1;
    }

    const button = await prisma.quickButton.create({
      data: {
        label,
        url,
        icon: icon || null,
        category: category || 'default',
        order: newOrder,
        isActive: true,
      },
    });

    return NextResponse.json({ button }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'Failed to create quick button:');
  }
}

// PUT: 퀵버튼 수정 (권한 필요: Admin, Manager)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role || 'viewer';

    if (!canEdit(userRole)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { prisma } = await getTenantFromRequest();
    const body = await safeParseJson(request);
    if (body instanceof Response) return body;
    const { id, label, url, icon, category, order, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (url !== undefined && !isSafeUrl(url)) {
      return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 });
    }

    const button = await prisma.quickButton.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(url !== undefined && { url }),
        ...(icon !== undefined && { icon }),
        ...(category !== undefined && { category }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ button });
  } catch (error) {
    return handleRouteError(error, 'Failed to update quick button:');
  }
}

// DELETE: 퀵버튼 삭제 (권한 필요: Admin, Manager)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role || 'viewer';

    if (!canEdit(userRole)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { prisma } = await getTenantFromRequest();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await prisma.quickButton.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'Failed to delete quick button:');
  }
}

// PATCH: 순서 일괄 업데이트 (권한 필요: Admin, Manager)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role || 'viewer';

    if (!canEdit(userRole)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { prisma } = await getTenantFromRequest();
    const body = await safeParseJson(request);
    if (body instanceof Response) return body;
    const { buttons } = body;

    if (!Array.isArray(buttons)) {
      return NextResponse.json({ error: 'buttons array is required' }, { status: 400 });
    }

    // 트랜잭션으로 순서 일괄 업데이트
    await prisma.$transaction(
      buttons.map((btn: { id: string; order: number }) =>
        prisma.quickButton.update({
          where: { id: btn.id },
          data: { order: btn.order },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'Failed to reorder quick buttons:');
  }
}
