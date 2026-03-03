'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { AppHeader, Sidebar, AppFooter } from '@/components/layout';
import { cn } from '@/lib/utils';
import { useModuleMessages } from '@/hooks/useModuleMessages';
import { useTheme } from '@/components/theme-provider';
import { broadcastThemeChange } from '@/lib/module-protocol';

export default function ModulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState('');
  const { resolvedTheme } = useTheme();

  // iframe 모듈들로부터 메시지 수신 (활동/알림/KPI 자동 저장)
  useModuleMessages({
    onReady: (source) => console.log(`[Modules] ${source} module ready`),
  });

  // 테마 변경 시 iframe들에 알림
  useEffect(() => {
    broadcastThemeChange(resolvedTheme);
  }, [resolvedTheme]);

  // 점검 예고 배너 조회
  useEffect(() => {
    fetch('/api/auth/service-status')
      .then((res) => res.json())
      .then((status) => {
        if (status.notice) {
          setNoticeMessage(status.notice);
        }
      })
      .catch(() => {});
  }, []);

  const handleMobileClose = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onMenuClick={() => setMobileOpen(!mobileOpen)} />
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onCollapse={setSidebarCollapsed}
        onMobileClose={handleMobileClose}
      />

      <main
        className={cn(
          'transition-all duration-300 pt-16 pb-12',
          // 모바일: 마진 없음
          'ml-0',
          // 데스크탑: 사이드바에 따라 마진
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
        )}
      >
        {noticeMessage && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-3">
            <p className="text-sm text-blue-800 dark:text-blue-300 text-center">
              {noticeMessage}
            </p>
          </div>
        )}
        {children}
      </main>

      <AppFooter sidebarCollapsed={sidebarCollapsed} />
    </div>
  );
}
