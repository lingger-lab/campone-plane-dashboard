'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Bell,
  Plus,
  HelpCircle,
  User,
  Youtube,
  MessageCircle,
  Instagram,
  FileText,
  PenTool,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AppHeaderProps {
  onMenuClick?: () => void;
  className?: string;
}

const channelLinks = [
  { icon: Youtube, label: 'YouTube', href: 'https://youtube.com/@hongdemo', color: 'text-red-500' },
  { icon: MessageCircle, label: 'Kakao', href: 'https://pf.kakao.com/_hongdemo', color: 'text-yellow-500' },
  { icon: Instagram, label: 'Instagram', href: 'https://instagram.com/hongdemo', color: 'text-pink-500' },
  { icon: FileText, label: 'Blog', href: 'https://blog.naver.com/hongdemo', color: 'text-green-500' },
  { icon: PenTool, label: '현수막', href: '/studio/banners', color: 'text-primary' },
];

export function AppHeader({ onMenuClick, className }: AppHeaderProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b bg-background px-4',
        className
      )}
      role="banner"
    >
      {/* 모바일 검색 오버레이 */}
      {mobileSearchOpen && (
        <div className="absolute inset-0 z-50 flex items-center gap-2 bg-background px-4 lg:hidden">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="검색어를 입력하세요..."
              className="w-full pl-9"
              autoFocus
            />
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileSearchOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* 좌측: 로고 & 메뉴 토글 */}
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>

        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold">
            C1
          </div>
          <span className="hidden font-semibold sm:inline-block">CampOne</span>
        </Link>

        {/* 캠페인 스위처 */}
        <div className="hidden items-center gap-2 md:flex">
          <span className="text-sm text-muted-foreground">|</span>
          <Button variant="ghost" size="sm" className="gap-1">
            홍길동 캠페인
            <Badge variant="success" className="ml-1">
              Active
            </Badge>
          </Button>
        </div>
      </div>

      {/* 중앙: 전역 검색 (데스크탑) */}
      <div className="hidden max-w-md flex-1 px-4 lg:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="검색... (⌘K)"
            className="w-full pl-9"
          />
        </div>
      </div>

      {/* 우측: 채널 퀵링크 & 액션 */}
      <div className="flex items-center gap-1">
        {/* 채널 퀵링크 (데스크탑) */}
        <div className="hidden items-center gap-1 xl:flex">
          {channelLinks.map((channel) => (
            <Button
              key={channel.label}
              variant="ghost"
              size="icon"
              asChild
              className="h-8 w-8"
              title={channel.label}
            >
              <Link href={channel.href} target={channel.href.startsWith('http') ? '_blank' : undefined}>
                <channel.icon className={cn('h-4 w-4', channel.color)} />
              </Link>
            </Button>
          ))}
          <span className="mx-2 h-4 w-px bg-border" />
        </div>

        {/* 모바일 검색 버튼 */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileSearchOpen(true)}
          title="검색"
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* 빠른 생성 */}
        <Button variant="ghost" size="icon" title="빠른 생성" className="hidden sm:inline-flex">
          <Plus className="h-5 w-5" />
        </Button>

        {/* 알림 */}
        <Button variant="ghost" size="icon" className="relative" title="알림">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />
        </Button>

        {/* 도움말 - 모바일에서 숨김 */}
        <Button variant="ghost" size="icon" title="도움말" className="hidden sm:inline-flex">
          <HelpCircle className="h-5 w-5" />
        </Button>

        {/* 프로필 */}
        <Button variant="ghost" size="icon" className="ml-1 sm:ml-2" title="프로필">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
            <User className="h-4 w-4" />
          </div>
        </Button>
      </div>
    </header>
  );
}
