'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { User, Palette, MousePointer2, Link2, UserCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/components/theme-provider';
import { hasPermission } from '@/lib/rbac';
import type { UserRole } from '@/lib/types';
import { useTenant } from '@/lib/tenant/TenantContext';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { tenantId } = useTenant();

  const user = session?.user;
  const userName = user?.name || '사용자';
  const userEmail = user?.email || '';
  const userRole = (user as { role?: string })?.role || 'member';

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-muted-foreground">시스템 및 계정 설정</p>
      </div>

      {/* 프로필 설정 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">프로필</CardTitle>
              <CardDescription>계정 정보 관리</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold">
              {userName.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold">{userName}</h3>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
              <Badge variant="success" className="mt-1">
                {userRole}
              </Badge>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">이름</label>
              <Input defaultValue={userName} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">이메일</label>
              <Input defaultValue={userEmail} type="email" />
            </div>
          </div>
          <Button>변경사항 저장</Button>
        </CardContent>
      </Card>

      {/* 테마 설정 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">테마</CardTitle>
              <CardDescription>화면 테마 설정</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {[
              { key: 'light', label: '라이트' },
              { key: 'dark', label: '다크' },
              { key: 'system', label: '시스템' },
            ].map((t) => (
              <Button
                key={t.key}
                variant="outline"
                className={theme === t.key ? 'border-primary bg-primary/10 text-primary' : ''}
                onClick={() => setTheme(t.key as 'light' | 'dark' | 'system')}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 캠페인 프로필 관리 (Manager 이상만 표시) */}
      {hasPermission(userRole as UserRole, 'settings', 'update') && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <UserCircle className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">캠페인 프로필</CardTitle>
                <CardDescription>메인 대시보드 상단의 후보자 정보 관리</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link href={`/${tenantId}/settings/campaign-profile`}>
              <Button variant="outline" className="gap-2">
                프로필 설정
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* 퀵버튼 관리 (Manager 이상만 표시) */}
      {hasPermission(userRole as UserRole, 'quickButtons', 'update') && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <MousePointer2 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">퀵버튼 관리</CardTitle>
                <CardDescription>메인 대시보드에 표시되는 퀵버튼 관리</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link href={`/${tenantId}/settings/quick-buttons`}>
              <Button variant="outline" className="gap-2">
                퀵버튼 설정
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* 채널 링크 관리 (Manager 이상만 표시) */}
      {hasPermission(userRole as UserRole, 'channels', 'update') && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Link2 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">채널 링크 관리</CardTitle>
                <CardDescription>사이드바에 표시되는 외부 채널 링크 관리</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link href={`/${tenantId}/settings/channel-links`}>
              <Button variant="outline" className="gap-2">
                채널 링크 설정
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
