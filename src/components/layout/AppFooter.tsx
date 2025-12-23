'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink, Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

interface AppFooterProps {
  sidebarCollapsed?: boolean;
  className?: string;
}

// 시스템 상태 인디케이터
const systemStatus = [
  { label: 'API', status: 'online' },
  { label: 'Queue', status: 'online' },
  { label: 'Deploy', status: 'online' },
];

export function AppFooter({ sidebarCollapsed = false, className }: AppFooterProps) {
  const { theme, setTheme } = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <footer
      className={cn(
        'fixed bottom-0 right-0 z-30 flex h-11 items-center justify-between border-t bg-background px-4 text-sm transition-all duration-300',
        // 모바일: 전체 너비
        'left-0',
        // 데스크탑: 사이드바 고려
        sidebarCollapsed ? 'lg:left-16' : 'lg:left-60',
        className
      )}
    >
      {/* 좌측: 시스템 상태 */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          {systemStatus.map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <span className={cn('h-2 w-2 rounded-full', getStatusColor(item.status))} />
              <span className="hidden text-xs text-muted-foreground sm:inline">{item.label}</span>
            </div>
          ))}
        </div>
        <span className="hidden text-xs text-muted-foreground lg:inline">
          변화를 만드는 힘, CampOne
        </span>
      </div>

      {/* 중앙: 버전 정보 */}
      <div className="hidden items-center gap-4 lg:flex">
        <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs text-white">v1.0.0-demo</span>
        <Link href="/changelog" className="text-xs text-muted-foreground hover:text-foreground">
          릴리스 노트
        </Link>
        <span className="text-xs text-muted-foreground">단축키 ?</span>
      </div>

      {/* 우측: 언어/테마/사이트 열기 */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* 언어 선택 - 모바일에서 숨김 */}
        <Button variant="ghost" size="sm" className="hidden h-7 px-2 text-xs sm:inline-flex">
          KO
        </Button>

        {/* 테마 토글 */}
        <div className="flex items-center rounded-lg border p-0.5">
          <Button
            variant={theme === 'light' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setTheme('light')}
            title="라이트 모드"
          >
            <Sun className="h-3 w-3 text-white" />
          </Button>
          <Button
            variant={theme === 'dark' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setTheme('dark')}
            title="다크 모드"
          >
            <Moon className="h-3 w-3 text-white" />
          </Button>
          <Button
            variant={theme === 'system' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setTheme('system')}
            title="시스템 설정"
          >
            <Monitor className="h-3 w-3 text-white" />
          </Button>
        </div>

        {/* 퍼블릭 사이트 - 모바일에서 아이콘만 */}
        <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs sm:px-3" asChild>
          <Link href="https://hongdemo.com" target="_blank">
            <span className="hidden sm:inline">사이트 열기</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </footer>
  );
}
