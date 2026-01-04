'use client';

import React, { useEffect } from 'react';
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
} from 'lucide-react';
import { SiYoutube, SiKakaotalk, SiInstagram, SiNaver } from 'react-icons/si';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

// 채널 링크 데이터
const channelLinks = [
  { icon: SiYoutube, label: '유튜브', href: 'https://www.youtube.com/@CampOne-w9p', color: 'text-red-600' },
  { icon: SiKakaotalk, label: '카카오', href: 'https://open.kakao.com/o/gQ9XBl9h', color: 'text-yellow-500' },
  { icon: SiInstagram, label: '인스타', href: 'https://instagram.com/hongdemo', color: 'text-pink-600' },
  { icon: SiNaver, label: '네이버', href: 'https://blog.naver.com/nineuri/224131041233', color: 'text-[#03C75A]' },
  { icon: PenTool, label: '현수막', href: '/studio/banners', color: 'text-primary' },
];

const bottomItems = [
  { icon: Shield, label: '권한/역할', href: '/roles' },
  { icon: History, label: '활동 로그', href: '/audit' },
  { icon: Settings, label: '설정', href: '/settings' },
  { icon: HelpCircle, label: '도움말', href: '/help' },
];

export function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onCollapse,
  onMobileClose,
  className
}: SidebarProps) {
  const pathname = usePathname();

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
      {/* 메인 메뉴 */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {menuItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={active ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 group',
                  collapsed && 'justify-center px-2',
                  active && 'text-white'
                )}
              >
                <item.icon className={cn('h-5 w-5 shrink-0 icon-pulse', active && 'text-white')} />
                {!collapsed && (
                  <>
                    <span className={cn('flex-1 text-left', active && 'text-white')}>{item.label}</span>
                    {item.badge && (
                      <span className={cn('text-xs', active ? 'text-white/80' : 'text-muted-foreground')}>{item.badge}</span>
                    )}
                  </>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* 구분선 */}
      <div className="mx-4 border-t" />

      {/* 채널 링크 */}
      <nav className="space-y-1 p-2">
        <div className={cn('px-3 py-2 text-xs font-semibold text-muted-foreground', collapsed && 'hidden')}>
          채널 링크
        </div>
        {channelLinks.map((item) => {
          return (
            <Link
              key={item.href}
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
                <item.icon className={cn('h-4 w-4 shrink-0 icon-pulse', item.color)} />
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
                variant={active ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 group',
                  collapsed && 'justify-center px-2',
                  active && 'text-white'
                )}
                size="sm"
              >
                <item.icon className={cn('h-4 w-4 shrink-0 icon-pulse', active && 'text-white')} />
                {!collapsed && <span className={cn(active && 'text-white')}>{item.label}</span>}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* 구분선 */}
      <div className="mx-4 border-t" />

      {/* QR 코드 섹션 */}
      {!collapsed && (
        <div className="p-4 flex flex-col items-center gap-2">
          <div className="text-xs font-semibold text-muted-foreground mb-1">공개 사이트</div>
          <div className="bg-white p-2 rounded-lg shadow-sm">
            <QRCodeSVG
              value="https://campone.cloud/"
              size={120}
              level="H"
              includeMargin={false}
            />
          </div>
          <a
            href="https://campone.cloud/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline text-center break-all"
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
