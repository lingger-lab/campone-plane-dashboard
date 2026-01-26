'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { Bell, Menu, LogOut, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAlerts, useMarkAlertAsRead, getAlertStyles, Alert } from '@/hooks/useAlerts';

interface AppHeaderProps {
  onMenuClick?: () => void;
  className?: string;
}

// 상대적 시간 포맷팅
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR');
}

export function AppHeader({ onMenuClick, className }: AppHeaderProps) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { data: session } = useSession();

  // 알림 데이터 조회
  const { data: alertsData, isLoading: alertsLoading } = useAlerts(10);
  const markAsRead = useMarkAlertAsRead();

  const unreadCount = alertsData?.unreadCount ?? 0;
  const alerts = alertsData?.alerts ?? [];

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  const handleMarkAsRead = (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead.mutate(alertId);
  };

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b bg-background px-4',
        className
      )}
      role="banner"
    >
      {/* 좌측: 로고 & 메뉴 토글 */}
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>

        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/camponelogo.svg"
            alt="CampOne"
            width={98}
            height={98}
            className="object-contain"
            style={{ width: '98px', height: '98px' }}
            priority
          />
        </Link>

        {/* 캠페인 스위처 */}
        <div className="hidden items-center gap-2 md:flex">
          <span className="text-sm text-muted-foreground">|</span>
          <Button variant="ghost" size="sm" className="gap-1">
            유해남 캠페인
            <Badge variant="success" className="ml-1">
              Active
            </Badge>
          </Button>
        </div>
      </div>

      {/* 우측: 액션 */}
      <div className="flex items-center gap-1">
        {/* 알림 */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            title="알림"
            onClick={() => setNotificationOpen(!notificationOpen)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-medium text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {/* 알림 드롭다운 */}
          {notificationOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotificationOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-lg border bg-background shadow-lg">
                <div className="flex items-center justify-between border-b p-3">
                  <h3 className="font-semibold">알림</h3>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {unreadCount}개 읽지 않음
                    </Badge>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {alertsLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      로딩 중...
                    </div>
                  ) : alerts.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      알림이 없습니다
                    </div>
                  ) : (
                    <div className="divide-y">
                      {alerts.map((alert: Alert) => {
                        const styles = getAlertStyles(alert.severity);
                        return (
                          <div
                            key={alert.id}
                            className={cn(
                              'relative p-3 hover:bg-muted/50 transition-colors cursor-pointer',
                              !alert.read && styles.bg
                            )}
                            onClick={() => setNotificationOpen(false)}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', styles.dot)}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p
                                    className={cn(
                                      'text-sm font-medium truncate',
                                      !alert.read && 'font-semibold',
                                      !alert.read && styles.text
                                    )}
                                  >
                                    {alert.title}
                                  </p>
                                  {alert.source && (
                                    <Badge variant="outline" className="text-[10px] shrink-0">
                                      {alert.source}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                  {alert.message}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {formatRelativeTime(alert.createdAt)}
                                </p>
                              </div>
                              {!alert.read && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0"
                                  onClick={(e) => handleMarkAsRead(alert.id, e)}
                                  title="읽음 표시"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t p-2">
                  <Link
                    href="/audit?tab=alerts"
                    className="block w-full rounded-md px-3 py-2 text-center text-sm text-primary hover:bg-muted transition-colors"
                    onClick={() => setNotificationOpen(false)}
                  >
                    모든 알림 보기
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 프로필 & 로그아웃 */}
        <div className="relative ml-1 sm:ml-2">
          <Button
            variant="ghost"
            size="icon"
            title="프로필"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              <span className="text-sm font-semibold text-primary-foreground">
                {session?.user?.name?.charAt(0) || 'U'}
              </span>
            </div>
          </Button>

          {/* 프로필 드롭다운 메뉴 */}
          {profileMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-lg border bg-background shadow-lg">
                <div className="p-3 border-b">
                  <p className="text-sm font-medium">{session?.user?.name || '사용자'}</p>
                  <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    로그아웃
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
