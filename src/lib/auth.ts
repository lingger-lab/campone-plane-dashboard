import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import type { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: '이메일', type: 'email', placeholder: 'admin@campone.kr' },
        password: { label: '비밀번호', type: 'password' },
        tenantId: { label: '테넌트 ID', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.tenantId) {
          return null;
        }

        const { email, password, tenantId } = credentials;

        try {
          // TODO: 프로덕션에서는 테넌트별 DB에서 조회
          // const tenantPrisma = await getTenantPrisma(tenantId);
          // const user = await tenantPrisma.user.findUnique({ ... });

          // 개발 환경: 기존 단일 DB 사용
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user || !user.isActive) {
            return null;
          }

          // 비밀번호 검증
          const isValidPassword = await bcrypt.compare(password, user.password);

          if (!isValidPassword) {
            return null;
          }

          // lastLogin 업데이트
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId, // 테넌트 ID 포함
            avatar: user.avatar,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.avatar = user.avatar;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        session.user.avatar = token.avatar as string | null;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24시간
  },
  secret: process.env.NEXTAUTH_SECRET,
};
