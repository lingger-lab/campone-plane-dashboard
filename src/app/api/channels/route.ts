import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantFromRequest } from '@/lib/api/tenant-helper';
import { canEdit } from '@/lib/rbac';

// 기본 채널 데이터 (DB가 비어있을 때 사용)
const defaultChannels = [
  { key: 'youtube', label: '유튜브', url: 'https://www.youtube.com/@CampOne-w9p', icon: 'youtube', visible: true, order: 0 },
  { key: 'kakao', label: '카카오', url: 'https://open.kakao.com/o/gQ9XBl9h', icon: 'kakao', visible: true, order: 1 },
  { key: 'instagram', label: '인스타', url: 'https://instagram.com/hongdemo', icon: 'instagram', visible: true, order: 2 },
  { key: 'naver', label: '네이버', url: 'https://blog.naver.com/nineuri/224131041233', icon: 'naver', visible: true, order: 3 },
];

// key → icon 자동 매핑 (icon이 null일 때 사용)
const iconMapping: Record<string, string> = {
  youtube: 'youtube',
  kakao: 'kakao',
  instagram: 'instagram',
  naver: 'naver',
  naverBlog: 'naver',
  bannerDesigner: 'banner',
};

// 숨길 채널 키 목록
const hiddenChannelKeys = ['bannerDesigner'];

// GET: 채널 목록 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prisma } = await getTenantFromRequest();
    const channels = await prisma.channelLink.findMany({
      orderBy: { order: 'asc' },
    });

    // DB가 비어있으면 기본 데이터 반환
    if (channels.length === 0) {
      return NextResponse.json({ channels: defaultChannels });
    }

    // icon이 null이면 key 기반으로 자동 매핑, 숨길 채널 처리
    const processedChannels = channels
      .filter((ch) => !hiddenChannelKeys.includes(ch.key))
      .map((ch) => ({
        ...ch,
        icon: ch.icon || iconMapping[ch.key] || null,
      }));

    return NextResponse.json({ channels: processedChannels });
  } catch (error) {
    console.error('Failed to fetch channels:', error);
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
  }
}

// PUT: 채널 업데이트 (권한 필요: Admin, Manager)
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
    const body = await request.json();
    const { key, url, label, visible, order } = body;

    if (!key) {
      return NextResponse.json({ error: 'Channel key is required' }, { status: 400 });
    }

    const channel = await prisma.channelLink.upsert({
      where: { key },
      update: {
        ...(url !== undefined && { url }),
        ...(label !== undefined && { label }),
        ...(visible !== undefined && { visible }),
        ...(order !== undefined && { order }),
      },
      create: {
        key,
        url: url || '',
        label: label || key,
        visible: visible ?? true,
        order: order ?? 99,
      },
    });

    return NextResponse.json({ channel });
  } catch (error) {
    console.error('Failed to update channel:', error);
    return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 });
  }
}

// POST: 채널 일괄 저장 (권한 필요: Admin, Manager)
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
    const body = await request.json();
    const { channels } = body;

    if (!Array.isArray(channels)) {
      return NextResponse.json({ error: 'Channels array is required' }, { status: 400 });
    }

    // 전송된 채널 key 목록
    const submittedKeys = channels.map((ch: { key: string }) => ch.key);

    // 트랜잭션: 삭제된 채널 제거 + 나머지 업서트
    const results = await prisma.$transaction([
      // DB에 있지만 전송 목록에 없는 채널 삭제
      prisma.channelLink.deleteMany({
        where: { key: { notIn: submittedKeys } },
      }),
      // 나머지 채널 업서트
      ...channels.map((ch: { key: string; url?: string; label?: string; icon?: string; visible?: boolean; order?: number }) =>
        prisma.channelLink.upsert({
          where: { key: ch.key },
          update: {
            url: ch.url,
            label: ch.label,
            icon: ch.icon,
            visible: ch.visible,
            order: ch.order,
          },
          create: {
            key: ch.key,
            url: ch.url || '',
            label: ch.label || ch.key,
            icon: ch.icon || null,
            visible: ch.visible ?? true,
            order: ch.order ?? 99,
          },
        })
      ),
    ]);

    // results[0]은 deleteMany 결과, 나머지가 upsert 결과
    return NextResponse.json({ channels: results.slice(1) });
  } catch (error) {
    console.error('Failed to save channels:', error);
    return NextResponse.json({ error: 'Failed to save channels' }, { status: 500 });
  }
}
