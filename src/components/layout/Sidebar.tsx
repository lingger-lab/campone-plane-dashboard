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
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChannels, getChannelIconColor } from '@/hooks/useChannels';

interface SidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  onMobileClose?: () => void;
  className?: string;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: TrendingUp, label: 'Insights', href: '/pulse', badge: 'M1' },
  { icon: Palette, label: 'Studio', href: '/studio', badge: 'M2' },
  { icon: FileCheck, label: 'Policy Lab', href: '/policy', badge: 'M3' },
  { icon: ListChecks, label: 'Ops', href: '/ops', badge: 'M4' },
  { icon: Users, label: 'Civic Hub', href: '/hub', badge: 'M5' },
];

const bottomItems = [
  { icon: Shield, label: '권한/역할', href: '/roles' },
  { icon: History, label: '활동 & 알림', href: '/audit' },
  { icon: Settings, label: '설정', href: '/settings' },
  { icon: HelpCircle, label: '도움말', href: '/help' },
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
    if (href === '/') return pathname === '/';
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
      {/* 메인 메뉴 - 스크롤 가능 */}
      <nav className="flex-1 min-h-0 overflow-y-auto space-y-1 p-2">
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
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className={cn('text-xs', active ? 'opacity-80' : 'text-muted-foreground')}>{item.badge}</span>
                    )}
                  </>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* 채널 링크 - 고정 (스크롤 안됨) */}
      <div className="shrink-0 border-t">
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
      </div>

      {/* 하단 메뉴 - 고정 */}
      <div className="shrink-0 border-t">
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

      {/* QR 코드 섹션 - 큰 화면에서만 표시 */}
      {!collapsed && (
        <div className="shrink-0 border-t hidden xl:flex flex-col items-center gap-1 p-2">
          <div className="text-xs font-semibold text-muted-foreground">공개 사이트</div>
          <div className="bg-white p-1 rounded shadow-sm">
            <QRCodeSVG
              value="https://campone.cloud/"
              size={64}
              level="H"
              includeMargin={false}
            />
          </div>
          <a
            href="https://campone.cloud/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            campone.cloud
          </a>
        </div>
      )}

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
