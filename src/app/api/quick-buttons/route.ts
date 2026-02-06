import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantFromRequest } from '@/lib/api/tenant-helper';
import { hasPermission } from '@/lib/rbac';
import type { UserRole } from '@/lib/types';

// GET: 퀵버튼 목록 조회 (인증 불필요 - 공개)
export async function GET() {
  try {
    const { prisma } = await getTenantFromRequest();
    const buttons = await prisma.quickButton.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ buttons });
  } catch (error) {
    console.error('Failed to fetch quick buttons:', error);
    return NextResponse.json({ buttons: [] });
  }
}

// POST: 퀵버튼 생성 (권한 필요: Admin, Manager)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role?: UserRole }).role || 'member';

    if (!hasPermission(userRole, 'quickButtons', 'create')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { prisma } = await getTenantFromRequest();
    const body = await request.json();
    const { label, url, icon, category, order } = body;

    if (!label || !url) {
      return NextResponse.json({ error: 'label and url are required' }, { status: 400 });
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
    console.error('Failed to create quick button:', error);
    return NextResponse.json({ error: 'Failed to create quick button' }, { status: 500 });
  }
}

// PUT: 퀵버튼 수정 (권한 필요: Admin, Manager)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role?: UserRole }).role || 'member';

    if (!hasPermission(userRole, 'quickButtons', 'update')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { prisma } = await getTenantFromRequest();
    const body = await request.json();
    const { id, label, url, icon, category, order, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
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
    console.error('Failed to update quick button:', error);
    return NextResponse.json({ error: 'Failed to update quick button' }, { status: 500 });
  }
}

// DELETE: 퀵버튼 삭제 (권한 필요: Admin, Manager)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role?: UserRole }).role || 'member';

    if (!hasPermission(userRole, 'quickButtons', 'delete')) {
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
    console.error('Failed to delete quick button:', error);
    return NextResponse.json({ error: 'Failed to delete quick button' }, { status: 500 });
  }
}

// PATCH: 순서 일괄 업데이트 (권한 필요: Admin, Manager)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role?: UserRole }).role || 'member';

    if (!hasPermission(userRole, 'quickButtons', 'update')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { prisma } = await getTenantFromRequest();
    const body = await request.json();
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
    console.error('Failed to reorder quick buttons:', error);
    return NextResponse.json({ error: 'Failed to reorder quick buttons' }, { status: 500 });
  }
}
