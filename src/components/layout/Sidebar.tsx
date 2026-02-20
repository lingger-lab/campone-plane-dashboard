'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  Palette,
  FileCheck,
  ListChecks,
  Users,
  Shield,
  History,
  Settings,
  HelpCircle,
  ChevronLeft,
  X,
  PenTool,
  Link as LinkIcon,
} from 'lucide-react';
import { SiYoutube, SiKakaotalk, SiInstagram, SiNaver } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChannels, getChannelIconColor } from '@/hooks/useChannels';
import { useTenant } from '@/lib/tenant/TenantContext';
import type { TenantFeatures } from '@/lib/tenant/types';

interface SidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  onMobileClose?: () => void;
  className?: string;
}

// pathSuffix로 변경 (tenant prefix는 동적으로 추가)
// featureKey: config.features의 키와 매핑
const menuItemsBase = [
  { icon: LayoutDashboard, label: 'Dashboard', pathSuffix: '', featureKey: null },
  { icon: TrendingUp, label: 'Insights', pathSuffix: '/pulse', featureKey: 'pulse' as keyof TenantFeatures },
  { icon: Palette, label: 'Studio', pathSuffix: '/studio', featureKey: 'studio' as keyof TenantFeatures },
  { icon: FileCheck, label: 'Policy Lab', pathSuffix: '/policy', featureKey: 'policy' as keyof TenantFeatures },
  { icon: ListChecks, label: 'Ops', pathSuffix: '/ops', featureKey: 'ops' as keyof TenantFeatures },
  { icon: Users, label: 'Civic Hub', pathSuffix: '/hub', featureKey: 'hub' as keyof TenantFeatures },
];

const bottomItemsBase = [
  { icon: Shield, label: '권한/역할', pathSuffix: '/roles' },
  { icon: History, label: '활동 & 알림', pathSuffix: '/audit' },
  { icon: Settings, label: '설정', pathSuffix: '/settings' },
  { icon: HelpCircle, label: '도움말', pathSuffix: '/help' },
];

// 아이콘 키 → 컴포넌트 매핑
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  youtube: SiYoutube,
  kakao: SiKakaotalk,
  instagram: SiInstagram,
  naver: SiNaver,
  banner: PenTool,
};

export function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onCollapse,
  onMobileClose,
  className
}: SidebarProps) {
  const pathname = usePathname();
  const { data: channelsData } = useChannels();
  const { tenantId, config } = useTenant();

  // 테넌트 prefix가 적용된 메뉴 아이템 (features 설정에 따라 필터링)
  const menuItems = useMemo(() => {
    const prefix = tenantId ? `/${tenantId}` : '';
    return menuItemsBase
      .filter((item) => {
        // Dashboard는 항상 표시
        if (!item.featureKey) return true;
        // features 설정에 따라 필터링 (기본값: true)
        return config.features?.[item.featureKey] !== false;
      })
      .map((item) => ({
        ...item,
        href: prefix + item.pathSuffix || prefix || '/',
      }));
  }, [tenantId, config.features]);

  const bottomItems = useMemo(() => {
    const prefix = tenantId ? `/${tenantId}` : '';
    return bottomItemsBase.map((item) => ({
      ...item,
      href: prefix + item.pathSuffix,
    }));
  }, [tenantId]);

  // 표시할 채널 링크 (visible=true만)
  const channelLinks = useMemo(() => {
    const channels = channelsData?.channels || [];
    return channels
      .filter((ch) => ch.visible)
      .sort((a, b) => a.order - b.order)
      .map((ch) => ({
        key: ch.key,
        label: ch.label,
        href: ch.url,
        icon: iconMap[ch.icon || ''] || LinkIcon,
        color: getChannelIconColor(ch.icon),
      }));
  }, [channelsData]);

  // 페이지 이동 시 모바일 사이드바 닫기
  useEffect(() => {
    onMobileClose?.();
  }, [pathname, onMobileClose]);

  // ESC 키로 모바일 사이드바 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose?.();
    };
    if (mobileOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [mobileOpen, onMobileClose]);

  const isActive = (href: string) => {
    // 테넌트 루트 경로 체크
    const tenantRoot = tenantId ? `/${tenantId}` : '/';
    if (href === tenantRoot || href === '/') {
      return pathname === tenantRoot;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* 모바일 오버레이 백드롭 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed bottom-0 left-0 top-16 z-50 flex flex-col border-r bg-background transition-all duration-300',
          // 데스크탑: 항상 표시, 접기 가능
          'hidden lg:flex',
          collapsed ? 'lg:w-16' : 'lg:w-60',
          // 모바일: mobileOpen일 때만 표시
          mobileOpen && 'flex w-72',
          className
        )}
      >
      {/* 모듈 메뉴 (M1-M5) - 고정 (가장 중요) */}
      <nav className="shrink-0 space-y-1 p-2">
        {menuItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={active ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 group',
                  collapsed && 'justify-center px-2'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0 icon-pulse" />
                {!collapsed && (
                  <span className="flex-1 text-left">{item.label}</span>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* 나머지 영역 - 스크롤 가능 */}
      <div className="flex-1 min-h-0 overflow-y-auto border-t">
        {/* 채널 링크 */}
        <nav className="space-y-1 p-2">
          <div className={cn('px-3 py-1 text-xs font-semibold text-muted-foreground', collapsed && 'hidden')}>
            채널 링크
          </div>
          {channelLinks.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                target={item.href.startsWith('http') ? '_blank' : undefined}
              >
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start gap-3 group',
                    collapsed && 'justify-center px-2'
                  )}
                  size="sm"
                >
                  <IconComponent className={cn('h-4 w-4 shrink-0 icon-pulse', item.color)} />
                  {!collapsed && <span>{item.label}</span>}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* 구분선 */}
        <div className="mx-4 border-t" />

        {/* 하단 메뉴 */}
        <nav className="space-y-1 p-2">
          {bottomItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={active ? 'default' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 group',
                    collapsed && 'justify-center px-2'
                  )}
                  size="sm"
                >
                  <item.icon className="h-4 w-4 shrink-0 icon-pulse" />
                  {!collapsed && <span>{item.label}</span>}
                </Button>
              </Link>
            );
          })}
        </nav>

      </div>

      {/* 모바일: 닫기 버튼 */}
      <div className="border-t p-2 lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={onMobileClose}
        >
          <X className="h-4 w-4 mr-2" />
          닫기
        </Button>
      </div>

      {/* 데스크탑: 접기 버튼 */}
      <div className="hidden lg:block border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn('w-full', collapsed && 'justify-center')}
          onClick={() => onCollapse?.(!collapsed)}
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 transition-transform',
              collapsed && 'rotate-180'
            )}
          />
          {!collapsed && <span className="ml-2">접기</span>}
        </Button>
      </div>
    </aside>
    </>
  );
}
