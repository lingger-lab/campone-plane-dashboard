import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Storage } from '@google-cloud/storage';
import { authOptions } from '@/lib/auth';
import { canEdit } from '@/lib/rbac';
import { getTenantFromRequest } from '@/lib/api/tenant-helper';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'campone-assets';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_CATEGORIES = ['profile', 'module'] as const;
const ALLOWED_MODULE_KEYS = ['pulse', 'studio', 'policy', 'ops', 'hub'] as const;

function getStorage(): Storage {
  return new Storage();
}

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC 확인 (settings:update 권한 필요)
    const userRole = (session.user as { role?: string }).role || 'viewer';
    if (!canEdit(userRole)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // 테넌트 확인
    const { tenantId } = await getTenantFromRequest();

    // FormData 파싱
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string;
    const moduleKey = formData.get('moduleKey') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 카테고리 검증
    if (!ALLOWED_CATEGORIES.includes(category as typeof ALLOWED_CATEGORIES[number])) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // 모듈 키 검증 (모듈 이미지인 경우)
    if (category === 'module') {
      if (!moduleKey || !ALLOWED_MODULE_KEYS.includes(moduleKey as typeof ALLOWED_MODULE_KEYS[number])) {
        return NextResponse.json({ error: 'Invalid moduleKey' }, { status: 400 });
      }
    }

    // 파일 타입 검증
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `허용되지 않는 파일 형식입니다. (${ALLOWED_TYPES.join(', ')})` },
        { status: 400 }
      );
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB 이하여야 합니다.` },
        { status: 400 }
      );
    }

    // 파일 확장자 추출
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';

    // GCS 경로 생성
    let gcsPath: string;
    if (category === 'profile') {
      gcsPath = `${tenantId}/profile/photo.${ext}`;
    } else {
      gcsPath = `${tenantId}/modules/${moduleKey}.${ext}`;
    }

    // 파일 버퍼 읽기
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // GCS 업로드
    const storage = getStorage();
    const bucket = storage.bucket(BUCKET_NAME);
    const blob = bucket.file(gcsPath);

    await blob.save(buffer, {
      contentType: file.type,
      metadata: {
        cacheControl: 'public, max-age=3600',
      },
    });

    // 공개 URL 생성
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${gcsPath}`;

    return NextResponse.json({
      url: publicUrl,
      path: gcsPath,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
