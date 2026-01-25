'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Phone, Mail, Clock, ExternalLink, Sun, Moon, Monitor } from 'lucide-react';
import { SiYoutube, SiKakaotalk, SiInstagram, SiNaver } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

interface AppFooterProps {
  sidebarCollapsed?: boolean;
  className?: string;
}

// 소셜 미디어 링크
const socialLinks = [
  { icon: SiYoutube, label: '유튜브', href: 'https://www.youtube.com/@CampOne-w9p', color: 'text-red-600' },
  { icon: SiKakaotalk, label: '카카오톡', href: 'https://open.kakao.com/o/gQ9XBl9h', color: 'text-yellow-500' },
  { icon: SiInstagram, label: '인스타그램', href: 'https://instagram.com/hongdemo', color: 'text-pink-600' },
  { icon: SiNaver, label: '네이버', href: 'https://blog.naver.com/nineuri/224131041233', color: 'text-[#03C75A]' },
];

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
        'relative z-30 border-t bg-card/95 backdrop-blur-sm transition-all duration-300',
        // 데스크탑: 사이드바 고려
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60',
        className
      )}
    >
      {/* 메인 푸터 콘텐츠 */}
      <div className="container max-w-7xl mx-auto px-6 py-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* 선거대책본부 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">유해남 후보 선거대책본부</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              사천시장 후보<br />
              국민과 함께하는 정치, 청년에게 희망을, 경제 성장의 새 길
            </p>
            <div className="flex items-center gap-3 pt-2">
              {socialLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  className={cn('transition-transform hover:scale-110', item.color)}
                  title={item.label}
                >
                  <item.icon className="h-5 w-5" />
                </Link>
              ))}
            </div>
          </div>

          {/* 연락처 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">연락처</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span>경남 사천시 사천읍 중앙로 123<br />유해남 선거사무소 2층</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <span>055-123-4567</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <span>contact@hongdemo.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span>평일 09:00 - 18:00</span>
              </li>
            </ul>
          </div>

          {/* 바로가기 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">바로가기</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
                  대시보드
                </Link>
              </li>
              <li>
                <Link href="/pulse" className="text-muted-foreground hover:text-primary transition-colors">
                  인사이트
                </Link>
              </li>
              <li>
                <Link href="/studio" className="text-muted-foreground hover:text-primary transition-colors">
                  스튜디오
                </Link>
              </li>
              <li>
                <Link href="/policy" className="text-muted-foreground hover:text-primary transition-colors">
                  정책연구
                </Link>
              </li>
              <li>
                <Link href="/ops" className="text-muted-foreground hover:text-primary transition-colors">
                  운영관리
                </Link>
              </li>
              <li>
                <Link href="/hub" className="text-muted-foreground hover:text-primary transition-colors">
                  시민소통
                </Link>
              </li>
            </ul>
          </div>

          {/* 설정 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">설정</h3>
            {/* 테마 토글 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">테마:</span>
              <div className="flex items-center rounded-lg border p-0.5">
                <Button
                  variant={theme === 'light' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setTheme('light')}
                  title="라이트 모드"
                >
                  <Sun className="h-4 w-4" />
                </Button>
                <Button
                  variant={theme === 'dark' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setTheme('dark')}
                  title="다크 모드"
                >
                  <Moon className="h-4 w-4" />
                </Button>
                <Button
                  variant={theme === 'system' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setTheme('system')}
                  title="시스템 설정"
                >
                  <Monitor className="h-4 w-4 text-white" />
                </Button>
              </div>
            </div>

            {/* 시스템 상태 */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>시스템 상태:</span>
              {systemStatus.map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  <span className={cn('h-2 w-2 rounded-full', getStatusColor(item.status))} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            {/* 버전 */}
            <div className="text-xs">
              <span className="rounded bg-muted px-2 py-1 font-mono text-muted-foreground">v1.0.0-demo</span>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 법적 고지 */}
      <div className="border-t bg-muted/50">
        <div className="container max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="text-center md:text-left">
              <p>© 2025 유해남 후보 선거대책본부. All rights reserved.</p>
              <p className="mt-1">
                본 사이트는 공직선거법에 따라 운영됩니다. | 선거비용 제한액 준수
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-primary transition-colors">
                개인정보처리방침
              </Link>
              <Link href="/terms" className="hover:text-primary transition-colors">
                이용약관
              </Link>
              <span className="text-border">|</span>
              <span className="text-primary font-medium">Powered by CampOne</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
