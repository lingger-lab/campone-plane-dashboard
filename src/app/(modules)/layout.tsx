'use client';

import React, { useState, useCallback } from 'react';
import { AppHeader, Sidebar, AppFooter } from '@/components/layout';
import { cn } from '@/lib/utils';
import { useModuleMessages } from '@/hooks/useModuleMessages';

export default function ModulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // iframe 모듈들로부터 메시지 수신 (활동/알림/KPI 자동 저장)
  useModuleMessages({
    onReady: (source) => console.log(`[Modules] ${source} module ready`),
  });

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
        {children}
      </main>

      <AppFooter sidebarCollapsed={sidebarCollapsed} />
    </div>
  );
}
