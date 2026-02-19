import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTenantConfig, createDefaultTenantConfig } from '@/lib/tenant/config-loader';
import { TenantProvider } from '@/lib/tenant/TenantContext';
import { getSystemPrisma, getTenantPrisma } from '@/lib/prisma';
import { SERVICE_TO_FEATURE } from '@/lib/kpi-catalog';
import type { TenantFeatures } from '@/lib/tenant/types';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata({ params }: TenantLayoutProps): Promise<Metadata> {
  const { tenant: tenantId } = await params;

  try {
    const tenantPrisma = await getTenantPrisma(tenantId);
    const profile = await tenantPrisma.campaignProfile.findUnique({
      where: { id: 'main' },
      select: { candidateName: true, orgName: true },
    });

    if (profile?.candidateName && profile.candidateName !== '후보자명') {
      const title = `${profile.candidateName} ${profile.orgName || '선거대책본부'}`;
      return { title };
    }
  } catch {
    // DB 조회 실패 시 YAML displayName 시도
    const config = await getTenantConfig(tenantId);
    if (config?.displayName) {
      return { title: config.displayName };
    }
  }

  return { title: 'CampOne Dashboard' };
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenant: tenantId } = await params;

  // 테넌트 설정 로드
  let config = await getTenantConfig(tenantId);

  // YAML 없으면 시스템 DB에서 테넌트 확인 후 기본 설정 생성
  if (!config) {
    try {
      const systemDb = getSystemPrisma();
      const tenant = await systemDb.tenant.findUnique({
        where: { tenantId },
        select: { tenantId: true, name: true },
      });

      if (tenant) {
        config = createDefaultTenantConfig(tenantId);
        if (tenant.name) {
          config.name = tenant.name;
          config.displayName = tenant.name;
        }
      }
    } catch {
      // DB 조회 실패 시 개발 환경에서만 기본 설정 생성
      if (process.env.NODE_ENV === 'development' && tenantId.startsWith('camp-')) {
        config = createDefaultTenantConfig(tenantId);
      }
    }
  }

  // 설정이 없으면 404
  if (!config) {
    notFound();
  }

  // 시스템 DB의 enabled_services로 features 덮어쓰기
  try {
    const systemDb = getSystemPrisma();
    const tenant = await systemDb.tenant.findUnique({
      where: { tenantId },
      select: { enabledServices: true },
    });

    if (tenant?.enabledServices && Array.isArray(tenant.enabledServices)) {
      const enabledServices = tenant.enabledServices as string[];
      const features: TenantFeatures = {
        pulse: false,
        studio: false,
        policy: false,
        ops: false,
        hub: false,
      };

      for (const service of enabledServices) {
        const featureKey = SERVICE_TO_FEATURE[service];
        if (featureKey) {
          features[featureKey] = true;
        }
      }

      config = { ...config, features };
    }
  } catch (error) {
    // DB 조회 실패 시 YAML 설정 그대로 사용 (fallback)
    console.warn(`Failed to load enabledServices for ${tenantId}:`, error);
  }

  return <TenantProvider tenantId={tenantId} config={config}>{children}</TenantProvider>;
}

// 동적 라우트 설정
export const dynamic = 'force-dynamic';
