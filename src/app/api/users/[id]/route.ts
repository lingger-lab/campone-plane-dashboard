import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { getTenantFromRequest } from '@/lib/api/tenant-helper';
import { authOptions } from '@/lib/auth';

// 개별 사용자 조회 (시스템 DB)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { systemDb, tenantId } = await getTenantFromRequest();

    const membership = await systemDb.userTenant.findUnique({
      where: {
        userId_tenantId: { userId: params.id, tenantId },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: { ...membership.user, role: membership.role },
    });
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// 사용자 수정 (시스템 DB)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { systemDb, tenantId } = await getTenantFromRequest();
    const body = await request.json();
    const { name, role, password, isActive } = body;

    // 사용자 정보 업데이트
    const userUpdate: Record<string, string | boolean> = {};
    if (name !== undefined) userUpdate.name = name;
    if (isActive !== undefined) userUpdate.isActive = isActive;
    if (password) {
      userUpdate.passwordHash = await bcrypt.hash(password, 10);
    }

    if (Object.keys(userUpdate).length > 0) {
      await systemDb.user.update({
        where: { id: params.id },
        data: userUpdate,
      });
    }

    // 역할 업데이트 (user_tenants)
    if (role !== undefined) {
      await systemDb.userTenant.update({
        where: {
          userId_tenantId: { userId: params.id, tenantId },
        },
        data: { role },
      });
    }

    const membership = await systemDb.userTenant.findUnique({
      where: {
        userId_tenantId: { userId: params.id, tenantId },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      user: membership ? { ...membership.user, role: membership.role } : null,
    });
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// 사용자 비활성화 (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { systemDb } = await getTenantFromRequest();

    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot deactivate yourself' },
        { status: 400 }
      );
    }

    await systemDb.user.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to deactivate user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
