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
  Link2,
  Shield,
  History,
  Settings,
  HelpCircle,
  ChevronLeft,
  X,
} from 'lucide-react';
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

const bottomItems = [
  { icon: Link2, label: '채널 링크', href: '/channels' },
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
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive(item.href) ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start gap-3',
                collapsed && 'justify-center px-2'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="text-xs text-muted-foreground">{item.badge}</span>
                  )}
                </>
              )}
            </Button>
          </Link>
        ))}
      </nav>

      {/* 구분선 */}
      <div className="mx-4 border-t" />

      {/* 하단 메뉴 */}
      <nav className="space-y-1 p-2">
        {bottomItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive(item.href) ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start gap-3',
                collapsed && 'justify-center px-2'
              )}
              size="sm"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Button>
          </Link>
        ))}
      </nav>

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
