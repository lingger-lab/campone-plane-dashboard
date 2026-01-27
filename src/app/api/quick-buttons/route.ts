import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';
import type { UserRole } from '@/lib/types';

// 기본 퀵버튼 데이터 (DB가 비어있을 때 사용)
const defaultQuickButtons = [
  { id: 'default-1', label: '10대 공약', url: 'https://campone.cloud/vision', icon: 'List', category: 'primary', order: 0, isActive: true },
  { id: 'default-2', label: '출마선언', url: '/candidate-hong.mp4', icon: 'PlayCircle', category: 'video', order: 1, isActive: true },
  { id: 'default-3', label: '공약하이라이트', url: '/policy-highlight.mp4', icon: 'Video', category: 'video', order: 2, isActive: true },
  { id: 'default-4', label: '현장투어', url: '/field-tour.mp4', icon: 'MapPin', category: 'video', order: 3, isActive: true },
  { id: 'default-5', label: '주민인터뷰', url: '/resident-interview.mp4', icon: 'Users', category: 'video', order: 4, isActive: true },
  { id: 'default-6', label: '이슈에답하다', url: '/issue-answer.mp4', icon: 'MessageCircle', category: 'video', order: 5, isActive: true },
  { id: 'default-7', label: '후보자비전스토리', url: '/vision-story.mp4', icon: 'BookOpen', category: 'blog', order: 6, isActive: true },
  { id: 'default-8', label: '공약상세설명', url: '/policy-detail.mp4', icon: 'FileText', category: 'blog', order: 7, isActive: true },
  { id: 'default-9', label: '현장 리포트', url: '#', icon: 'FileCheck', category: 'blog', order: 8, isActive: true },
  { id: 'default-10', label: '정책팩트체크', url: '#', icon: 'CheckCircle2', category: 'blog', order: 9, isActive: true },
  { id: 'default-11', label: '캠페뉴스', url: '#', icon: 'Newspaper', category: 'blog', order: 10, isActive: true },
];

// GET: 퀵버튼 목록 조회 (인증 불필요 - 공개)
export async function GET() {
  try {
    const buttons = await prisma.quickButton.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    // DB가 비어있으면 기본 데이터 반환
    if (buttons.length === 0) {
      return NextResponse.json({ buttons: defaultQuickButtons });
    }

    return NextResponse.json({ buttons });
  } catch (error) {
    console.error('Failed to fetch quick buttons:', error);
    // DB 연결 실패 시에도 기본 데이터 반환
    return NextResponse.json({ buttons: defaultQuickButtons });
  }
}

// POST: 퀵버튼 생성 (권한 필요: Admin, Manager)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role?: UserRole }).role || 'Viewer';

    if (!hasPermission(userRole, 'quickButtons', 'create')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

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

    const userRole = (session.user as { role?: UserRole }).role || 'Viewer';

    if (!hasPermission(userRole, 'quickButtons', 'update')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { id, label, url, icon, category, order, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // 기본 데이터는 수정 불가
    if (id.startsWith('default-')) {
      return NextResponse.json(
        { error: '기본 버튼은 수정할 수 없습니다. 먼저 새 버튼을 추가해 주세요.', isDefault: true },
        { status: 400 }
      );
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

    const userRole = (session.user as { role?: UserRole }).role || 'Viewer';

    if (!hasPermission(userRole, 'quickButtons', 'delete')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // 기본 데이터는 삭제 불가
    if (id.startsWith('default-')) {
      return NextResponse.json(
        { error: '기본 버튼은 삭제할 수 없습니다. 먼저 새 버튼을 추가해 주세요.', isDefault: true },
        { status: 400 }
      );
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

    const userRole = (session.user as { role?: UserRole }).role || 'Viewer';

    if (!hasPermission(userRole, 'quickButtons', 'update')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { buttons } = body;

    if (!Array.isArray(buttons)) {
      return NextResponse.json({ error: 'buttons array is required' }, { status: 400 });
    }

    // 기본 데이터가 포함되어 있으면 순서 변경 불가
    const hasDefaultIds = buttons.some((btn: { id: string }) => btn.id.startsWith('default-'));
    if (hasDefaultIds) {
      return NextResponse.json(
        { error: '기본 버튼은 순서를 변경할 수 없습니다. 먼저 새 버튼을 추가해 주세요.', isDefault: true },
        { status: 400 }
      );
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
