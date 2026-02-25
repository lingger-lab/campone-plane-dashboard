'use client';

import React, { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { ShieldAlert } from 'lucide-react';
import { AppHeader, Sidebar, AppFooter } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { canEdit } from '@/lib/rbac';
import { cn } from '@/lib/utils';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMobileClose = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const userRole = (session?.user as { role?: string })?.role || 'viewer';

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
          'ml-0',
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
        )}
      >
        {status === 'loading' ? null : !canEdit(userRole) ? (
          <div className="container max-w-4xl mx-auto p-6">
            <Card>
              <CardContent className="p-12 text-center">
                <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">권한이 없습니다</h2>
                <p className="text-muted-foreground">
                  설정 페이지는 편집자(Editor) 이상 권한이 필요합니다.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          children
        )}
      </main>

      <AppFooter sidebarCollapsed={sidebarCollapsed} />
    </div>
  );
}
