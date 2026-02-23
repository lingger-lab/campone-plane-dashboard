import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSystemPrisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';
import openai from '@/lib/openai/client';
import { isOpenAIConfigured } from '@/lib/openai/client';

const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_CONTENT_LENGTH = 200 * 1024;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  const pdfParse = (await import('pdf-parse-fork')).default;
  const data = await pdfParse(Buffer.from(buffer));
  return data.text;
}

function getFileExtension(filename: string): string {
  return filename.toLowerCase().slice(filename.lastIndexOf('.'));
}

// GET: 문서 목록 조회 (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role || 'viewer';
    if (!hasPermission(userRole, 'admin')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const systemDb = getSystemPrisma();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const where = category ? { category } : {};
    const [items, total] = await Promise.all([
      systemDb.helpDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          category: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      systemDb.helpDocument.count({ where }),
    ]);

    return NextResponse.json({ items, total });
  } catch (error) {
    console.error('Failed to fetch help documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

// POST: 문서 업로드 (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role || 'viewer';
    if (!hasPermission(userRole, 'admin')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const category = (formData.get('category') as string) || 'general';

    if (!file) {
      return NextResponse.json({ error: '파일을 선택해주세요' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '파일이 5MB를 초과합니다' }, { status: 400 });
    }

    const extension = getFileExtension(file.name);
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { error: `지원 형식: ${SUPPORTED_EXTENSIONS.join(', ')}` },
        { status: 400 },
      );
    }

    let content: string;
    if (extension === '.pdf') {
      const buffer = await file.arrayBuffer();
      content = await extractTextFromPDF(buffer);
    } else {
      content = await file.text();
    }

    if (!content.trim()) {
      return NextResponse.json({ error: '빈 파일은 업로드할 수 없습니다' }, { status: 400 });
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      content = content.substring(0, MAX_CONTENT_LENGTH);
    }

    let embedding: number[] = [];
    if (isOpenAIConfigured()) {
      try {
        const response = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: content.slice(0, 8000),
        });
        embedding = response.data[0].embedding;
      } catch (err) {
        console.warn('임베딩 생성 실패, 빈 벡터로 저장:', err);
      }
    }

    const systemDb = getSystemPrisma();
    const document = await systemDb.helpDocument.create({
      data: {
        title: title || file.name,
        content,
        category,
        embedding,
        metadata: {
          originalName: file.name,
          size: file.size,
          type: file.type,
          extension,
        },
      },
    });

    return NextResponse.json(
      { success: true, document: { id: document.id, title: document.title } },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to upload help document:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}

// DELETE: 문서 삭제 (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role || 'viewer';
    if (!hasPermission(userRole, 'admin')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const systemDb = getSystemPrisma();
    await systemDb.helpDocument.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete help document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
