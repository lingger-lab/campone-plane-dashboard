import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantFromRequest } from '@/lib/api/tenant-helper';
import { hasPermission } from '@/lib/rbac';
import type { UserRole } from '@/lib/types';

// 정적 라우트로 빌드되면 PUT이 무시되므로 강제 동적 설정
export const dynamic = 'force-dynamic';

// 기본 프로필 데이터
const defaultProfile = {
  id: 'main',
  candidateName: '후보자명',
  candidateTitle: 'OO시장 후보',
  orgName: '선거대책본부',
  photoUrl: null,
  careers: [
    { icon: 'Briefcase', text: '경력 1' },
    { icon: 'GraduationCap', text: '경력 2' },
    { icon: 'Users', text: '경력 3' },
  ],
  slogans: ['슬로건 1', '슬로건 2', '슬로건 3'],
  // 연락처 정보 (푸터용)
  address: null,
  phone: null,
  email: null,
  hours: null,
  description: null,
};

// GET: 캠페인 프로필 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prisma } = await getTenantFromRequest();
    const profile = await prisma.campaignProfile.findUnique({
      where: { id: 'main' },
    });

    // DB에 없으면 기본 데이터 반환
    if (!profile) {
      return NextResponse.json({ profile: defaultProfile });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Failed to fetch campaign profile:', error);
    return NextResponse.json({ profile: defaultProfile });
  }
}

// PUT: 캠페인 프로필 업데이트 (권한 필요: Admin, Manager)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role?: UserRole }).role || 'member';

    // settings 권한 확인 (Admin, Manager만 가능)
    if (!hasPermission(userRole, 'settings', 'update')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { prisma } = await getTenantFromRequest();
    const body = await request.json();
    const { candidateName, candidateTitle, orgName, photoUrl, moduleImages, careers, slogans, address, phone, email, hours, description } = body;

    const profile = await prisma.campaignProfile.upsert({
      where: { id: 'main' },
      update: {
        ...(candidateName !== undefined && { candidateName }),
        ...(candidateTitle !== undefined && { candidateTitle }),
        ...(orgName !== undefined && { orgName }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(moduleImages !== undefined && { moduleImages }),
        ...(careers !== undefined && { careers }),
        ...(slogans !== undefined && { slogans }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(hours !== undefined && { hours }),
        ...(description !== undefined && { description }),
      },
      create: {
        id: 'main',
        candidateName: candidateName || defaultProfile.candidateName,
        candidateTitle: candidateTitle || defaultProfile.candidateTitle,
        orgName: orgName || defaultProfile.orgName,
        photoUrl: photoUrl || defaultProfile.photoUrl,
        moduleImages: moduleImages || {},
        careers: careers || defaultProfile.careers,
        slogans: slogans || defaultProfile.slogans,
        address: address || null,
        phone: phone || null,
        email: email || null,
        hours: hours || null,
        description: description || null,
      },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Failed to update campaign profile:', error);
    return NextResponse.json({ error: 'Failed to update campaign profile' }, { status: 500 });
  }
}
