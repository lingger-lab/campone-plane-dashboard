import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantIdFromRequest } from '@/lib/api/tenant-helper';

const CONTROL_URL = process.env.CONTROL_URL;
const SERVICE_API_KEY = process.env.CONTROL_SERVICE_API_KEY;

function controlHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_API_KEY}`,
  };
}

// ── 문의 제출 ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!CONTROL_URL || !SERVICE_API_KEY) {
      console.error('[inquiries] CONTROL_URL or SERVICE_API_KEY not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const tenantId = await getTenantIdFromRequest();
    const user = session.user as { id?: string; name?: string; email?: string };

    const body = await req.json();

    const res = await fetch(`${CONTROL_URL}/api/inquiries`, {
      method: 'POST',
      headers: controlHeaders(),
      body: JSON.stringify({
        tenantId,
        userId: user.id || '',
        userName: user.name || '',
        userEmail: user.email || '',
        category: body.category || 'general',
        title: body.title,
        content: body.content,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error || '문의 제출에 실패했습니다.' }, { status: res.status });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[inquiries] POST error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// ── 본인 문의 목록 조회 ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!CONTROL_URL || !SERVICE_API_KEY) {
      console.error('[inquiries] CONTROL_URL or SERVICE_API_KEY not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const tenantId = await getTenantIdFromRequest();
    const user = session.user as { id?: string };
    const { searchParams } = new URL(req.url);

    const query = new URLSearchParams({
      userId: user.id || '',
      tenantId,
      ...(searchParams.get('page') && { page: searchParams.get('page')! }),
      ...(searchParams.get('pageSize') && { pageSize: searchParams.get('pageSize')! }),
      ...(searchParams.get('status') && { status: searchParams.get('status')! }),
    });

    const res = await fetch(`${CONTROL_URL}/api/inquiries?${query}`, {
      headers: controlHeaders(),
      signal: AbortSignal.timeout(10_000),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error || '목록을 가져올 수 없습니다.' }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[inquiries] GET error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
