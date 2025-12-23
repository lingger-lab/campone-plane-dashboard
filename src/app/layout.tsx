import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Providers } from './providers';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://campone-dashboard-755458598444.asia-northeast3.run.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: '홍길동 후보 선거대책본부 | CampOne',
  description: '창녕군 국회의원 후보 홍길동 - 국민과 함께하는 정치, 청년에게 희망을, 경제 성장의 새 길',
  icons: {
    icon: '/favicon.svg',
  },
  // Open Graph - 카카오톡, 페이스북 등 SNS 공유 시 표시
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: siteUrl,
    siteName: '홍길동 후보 선거대책본부',
    title: '홍길동 후보 선거대책본부 | 창녕군 국회의원 후보',
    description: '국민과 함께하는 정치, 청년에게 희망을, 경제 성장의 새 길 - 창녕군민을 위한 10대 공약',
    images: [
      {
        url: '/og-image-d.png',
        width: 1200,
        height: 630,
        alt: '홍길동 후보 선거대책본부',
      },
    ],
  },
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: '홍길동 후보 선거대책본부 | 창녕군 국회의원 후보',
    description: '국민과 함께하는 정치, 청년에게 희망을, 경제 성장의 새 길',
    images: ['/og-image-d.png'],
  },
  // 기타 메타태그
  keywords: ['홍길동', '창녕군', '국회의원', '선거', '공약', '캠프원'],
  authors: [{ name: '홍길동 선거대책본부' }],
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
