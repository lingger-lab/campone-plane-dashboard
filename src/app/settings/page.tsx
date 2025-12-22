'use client';

import React from 'react';
import { User, Bell, Palette, Globe, Shield, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

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
              김
            </div>
            <div>
              <h3 className="font-semibold">김관리</h3>
              <p className="text-sm text-muted-foreground">admin@campone.kr</p>
              <Badge variant="success" className="mt-1">
                Admin
              </Badge>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">이름</label>
              <Input defaultValue="김관리" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">이메일</label>
              <Input defaultValue="admin@campone.kr" type="email" />
            </div>
          </div>
          <Button>변경사항 저장</Button>
        </CardContent>
      </Card>

      {/* 알림 설정 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">알림</CardTitle>
              <CardDescription>알림 수신 설정</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: '시스템 알림', desc: '시스템 상태 및 점검 알림', enabled: true },
            { label: '워크플로우 알림', desc: '승인 요청 및 태스크 알림', enabled: true },
            { label: '이메일 알림', desc: '중요 알림 이메일 수신', enabled: false },
            { label: '브라우저 알림', desc: '푸시 알림 수신', enabled: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
              <Button variant={item.enabled ? 'default' : 'outline'} size="sm">
                {item.enabled ? 'ON' : 'OFF'}
              </Button>
            </div>
          ))}
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
                variant={theme === t.key ? 'default' : 'outline'}
                onClick={() => setTheme(t.key as 'light' | 'dark' | 'system')}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 언어 설정 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">언어</CardTitle>
              <CardDescription>인터페이스 언어 설정</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="default">한국어</Button>
            <Button variant="outline">English</Button>
          </div>
        </CardContent>
      </Card>

      {/* 데이터 관리 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">데이터 관리</CardTitle>
              <CardDescription>데이터 내보내기 및 백업</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">데이터 내보내기</p>
              <p className="text-sm text-muted-foreground">모든 데이터를 CSV로 내보내기</p>
            </div>
            <Button variant="outline">내보내기</Button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">백업 생성</p>
              <p className="text-sm text-muted-foreground">현재 상태의 백업 생성</p>
            </div>
            <Button variant="outline">백업</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
