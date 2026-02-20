import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { getTenantFromRequest } from '@/lib/api/tenant-helper';
import { authOptions } from '@/lib/auth';

// 사용자 목록 조회 (시스템 DB - 현재 테넌트 소속 사용자만)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { systemDb, tenantId } = await getTenantFromRequest();
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    // 현재 테넌트에 소속된 사용자만 조회
    const memberships = await systemDb.userTenant.findMany({
      where: {
        tenantId,
        ...(role ? { role } : {}),
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

    const users = memberships.map((m) => ({
      ...m.user,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// 사용자 생성 (시스템 DB + user_tenants 매핑)
export async function POST(request: NextRequest) {
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
    const { email, name, password, role = 'viewer' } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'email, name, password are required' },
        { status: 400 }
      );
    }

    // 이메일 중복 체크
    const existing = await systemDb.user.findUnique({
      where: { email },
    });

    if (existing) {
      // 이미 존재하는 사용자 → 테넌트 매핑만 추가
      const existingMembership = await systemDb.userTenant.findUnique({
        where: {
          userId_tenantId: { userId: existing.id, tenantId },
        },
      });

      if (existingMembership) {
        return NextResponse.json(
          { error: 'User already in this tenant' },
          { status: 409 }
        );
      }

      await systemDb.userTenant.create({
        data: { userId: existing.id, tenantId, role },
      });

      return NextResponse.json({
        user: { id: existing.id, email: existing.email, name: existing.name, role },
      }, { status: 201 });
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 트랜잭션: 사용자 생성 + 테넌트 매핑
    const user = await systemDb.user.create({
      data: {
        email,
        name,
        passwordHash: hashedPassword,
        tenants: {
          create: { tenantId, role, isDefault: true },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user: { ...user, role } }, { status: 201 });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
