import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { authOptions } from '@/lib/auth';

// 임베드 토큰 시크릿 (모든 서비스에서 동일하게 사용)
const EMBED_JWT_SECRET = process.env.EMBED_JWT_SECRET || 'campone-embed-secret-change-in-production';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // JWT 토큰 생성 (1시간 유효)
    const token = jwt.sign(
      {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role || 'user',
        source: 'dashboard',
      },
      EMBED_JWT_SECRET,
      { expiresIn: '1h' }
    );

    return NextResponse.json({
      token,
      expiresIn: 3600, // 초 단위
    });
  } catch (error) {
    console.error('Embed token generation error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: '토큰 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}