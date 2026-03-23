import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { getTenantFromRequest, safeParseJson, handleRouteError } from '@/lib/api/tenant-helper';
import { authOptions } from '@/lib/auth';

const VALID_ROLES = ['admin', 'editor', 'viewer'] as const;

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
    return handleRouteError(error, 'Failed to fetch user:');
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

    // 대상 유저가 현재 테넌트 소속인지 확인
    const existingMembership = await systemDb.userTenant.findUnique({
      where: { userId_tenantId: { userId: params.id, tenantId } },
    });
    if (!existingMembership) {
      return NextResponse.json({ error: 'User not found in this tenant' }, { status: 404 });
    }

    const body = await safeParseJson(request);
    if (body instanceof Response) return body;
    const { name, role, password, isActive } = body;

    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `role must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    // 사용자 정보 + 역할을 트랜잭션으로 일괄 업데이트
    const userUpdate: Record<string, string | boolean> = {};
    if (name !== undefined) userUpdate.name = name;
    if (isActive !== undefined) userUpdate.isActive = isActive;
    if (password) {
      userUpdate.passwordHash = await bcrypt.hash(password, 10);
    }

    await systemDb.$transaction(async (tx) => {
      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id: params.id },
          data: userUpdate,
        });
      }

      if (role !== undefined) {
        await tx.userTenant.update({
          where: {
            userId_tenantId: { userId: params.id, tenantId },
          },
          data: { role },
        });
      }
    });

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
    return handleRouteError(error, 'Failed to update user:');
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

    const { systemDb, tenantId } = await getTenantFromRequest();

    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot deactivate yourself' },
        { status: 400 }
      );
    }

    // 대상 유저가 현재 테넌트 소속인지 확인
    const membership = await systemDb.userTenant.findUnique({
      where: { userId_tenantId: { userId: params.id, tenantId } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'User not found in this tenant' }, { status: 404 });
    }

    await systemDb.user.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'Failed to deactivate user:');
  }
}
