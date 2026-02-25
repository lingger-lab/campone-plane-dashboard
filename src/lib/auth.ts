import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getSystemPrisma } from '@/lib/prisma';
import { checkMaintenance, checkTenantStatus } from '@/lib/service-guard';
import type { NextAuthOptions } from 'next-auth';

const SERVICE_NAME = 'dashboard';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: '이메일', type: 'email', placeholder: 'admin@campone.kr' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const { email, password } = credentials;

        try {
          // 0. 서비스 점검 모드 확인
          const maintenance = await checkMaintenance();
          if (maintenance.maintenance) {
            return null;
          }

          const systemDb = getSystemPrisma();

          // 1. 시스템 DB에서 사용자 조회 + isActive 확인
          const user = await systemDb.user.findUnique({
            where: { email },
          });

          if (!user || !user.isActive) {
            return null;
          }

          // 2. 비밀번호 검증
          const isValidPassword = await bcrypt.compare(password, user.passwordHash);

          if (!isValidPassword) {
            return null;
          }

          // 3. 소속 캠프 자동 매칭 (is_default 우선 → 첫 번째)
          const memberships = await systemDb.userTenant.findMany({
            where: { userId: user.id },
            orderBy: [{ isDefault: 'desc' }, { joinedAt: 'asc' }],
          });

          if (memberships.length === 0) {
            return null;
          }

          const defaultMembership = memberships[0];

          // 4. 테넌트 활성 + 서비스 활성 확인
          const tenantStatus = await checkTenantStatus(defaultMembership.tenantId);

          if (!tenantStatus.isActive) {
            return null;
          }

          const services = tenantStatus.enabledServices;
          if (
            Object.keys(services).length > 0 &&
            services[SERVICE_NAME] === false
          ) {
            return null;
          }

          // 5. updatedAt 갱신
          await systemDb.user.update({
            where: { id: user.id },
            data: { updatedAt: new Date() },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: defaultMembership.role,
            tenantId: defaultMembership.tenantId,
            isSystemAdmin: user.isSystemAdmin,
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
        token.isSystemAdmin = user.isSystemAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        session.user.isSystemAdmin = token.isSystemAdmin as boolean;
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

if (!process.env.NEXTAUTH_SECRET) {
  console.error('FATAL: NEXTAUTH_SECRET is not set. Sessions will not be secure.');
}
