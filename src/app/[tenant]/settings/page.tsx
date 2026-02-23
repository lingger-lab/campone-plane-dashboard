'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { MousePointer2, Link2, UserCircle, ChevronRight, BarChart3, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import { canEdit as canEditRole } from '@/lib/rbac';
import { useTenant } from '@/lib/tenant/TenantContext';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { tenantId } = useTenant();

  const user = session?.user;
  const userRole = (user as { role?: string })?.role || 'viewer';

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-muted-foreground">시스템 및 계정 설정</p>
      </div>

      {/* 대시보드 KPI 설정 (Manager 이상만 표시) */}
      {canEditRole(userRole) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">대시보드 KPI</CardTitle>
                <CardDescription>메인 대시보드에 표시할 핵심 지표 선택</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link href={`/${tenantId}/settings/dashboard-kpi`}>
              <Button variant="outline" className="gap-2">
                KPI 설정
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* 캠페인 프로필 관리 (Manager 이상만 표시) */}
      {canEditRole(userRole) && (
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
      {canEditRole(userRole) && (
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

      {/* 약관/개인정보 관리 (Manager 이상만 표시) */}
      {canEditRole(userRole) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">약관 및 개인정보처리방침</CardTitle>
                <CardDescription>이용약관과 개인정보처리방침 문서 관리</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link href={`/${tenantId}/settings/legal`}>
              <Button variant="outline" className="gap-2">
                법적 고지 관리
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* 채널 링크 관리 (Manager 이상만 표시) */}
      {canEditRole(userRole) && (
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
