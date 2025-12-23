import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// 데모용 관리자 계정 (실제 서비스에서는 DB 사용 필수)
const DEMO_ADMIN = {
  id: '1',
  email: 'admin@campone.cloud',
  name: '관리자',
  password: 'admin123', // 실제 서비스에서는 해싱 필수
  role: 'admin',
};

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: '이메일', type: 'email', placeholder: 'admin@campone.cloud' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        // 데모용 인증 로직
        if (
          credentials?.email === DEMO_ADMIN.email &&
          credentials?.password === DEMO_ADMIN.password
        ) {
          return {
            id: DEMO_ADMIN.id,
            email: DEMO_ADMIN.email,
            name: DEMO_ADMIN.name,
            role: DEMO_ADMIN.role,
          };
        }
        return null;
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
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24시간
  },
  secret: process.env.NEXTAUTH_SECRET || 'campone-demo-secret-key-change-in-production',
});

export { handler as GET, handler as POST };
