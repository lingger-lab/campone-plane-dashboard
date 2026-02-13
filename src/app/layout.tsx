import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Providers } from './providers';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://campone-dashboard-i2syevvyaq-du.a.run.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'CampOne Dashboard',
  description: 'CampOne - 선거 캠프 통합 관리 플랫폼',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: siteUrl,
    siteName: 'CampOne',
    title: 'CampOne Dashboard',
    description: '선거 캠프 통합 관리 플랫폼 - 여론 분석, 콘텐츠, 정책, 운영, 시민 소통',
    images: [
      {
        url: '/og-image-d.png',
        width: 1200,
        height: 630,
        alt: 'CampOne Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CampOne Dashboard',
    description: '선거 캠프 통합 관리 플랫폼',
    images: ['/og-image-d.png'],
  },
  keywords: ['캠프원', 'CampOne', '선거', '캠프', '대시보드'],
  authors: [{ name: 'CampOne' }],
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
