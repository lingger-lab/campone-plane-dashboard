import { notFound } from 'next/navigation';
import { getTenantConfig, createDefaultTenantConfig } from '@/lib/tenant/config-loader';
import { TenantProvider } from '@/lib/tenant/TenantContext';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenant: tenantId } = await params;

  // 테넌트 설정 로드
  let config = await getTenantConfig(tenantId);

  // 개발 환경: 설정이 없으면 기본 설정 사용
  if (!config && process.env.NODE_ENV === 'development') {
    // camp-* 또는 demo 형식이면 기본 설정 생성
    if (tenantId.startsWith('camp-') || tenantId === 'demo') {
      config = createDefaultTenantConfig(tenantId);
    }
  }

  // 설정이 없으면 404
  if (!config) {
    notFound();
  }

  return <TenantProvider tenantId={tenantId} config={config}>{children}</TenantProvider>;
}

// 동적 라우트 설정
export const dynamic = 'force-dynamic';
