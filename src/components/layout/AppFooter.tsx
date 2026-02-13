'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { MapPin, Phone, Mail, Clock, Sun, Moon, Monitor, Link as LinkIcon } from 'lucide-react';
import { SiYoutube, SiKakaotalk, SiInstagram, SiNaver } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { useChannels, getChannelIconColor } from '@/hooks/useChannels';
import { useCampaignProfile } from '@/hooks/useCampaignProfile';
import { useTenant } from '@/lib/tenant/TenantContext';

interface AppFooterProps {
  sidebarCollapsed?: boolean;
  className?: string;
}

// 아이콘 키 → 컴포넌트 매핑
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  youtube: SiYoutube,
  kakao: SiKakaotalk,
  instagram: SiInstagram,
  naver: SiNaver,
};

export function AppFooter({ sidebarCollapsed = false, className }: AppFooterProps) {
  const { theme, setTheme } = useTheme();
  const { data: channelsData } = useChannels();
  const { data: profileData } = useCampaignProfile();
  const { tenantId } = useTenant();

  // 테넌트 기반 경로 생성
  const basePath = tenantId ? `/${tenantId}` : '';

  // 채널 데이터로 소셜 링크 구성
  const socialLinks = useMemo(() => {
    const channels = channelsData?.channels || [];
    return channels
      .filter((ch) => ch.visible)
      .sort((a, b) => a.order - b.order)
      .map((ch) => ({
        key: ch.key,
        icon: iconMap[ch.icon || ''] || LinkIcon,
        label: ch.label,
        href: ch.url,
        color: getChannelIconColor(ch.icon),
      }));
  }, [channelsData]);

  // 프로필 데이터
  const profile = profileData?.profile;

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
            <h3 className="text-lg font-bold text-foreground">
              {profile?.candidateName || '후보자명'} {profile?.orgName || '선거대책본부'}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {profile?.candidateTitle || 'OO시장 후보'}
              {profile?.description && (
                <>
                  <br />
                  {profile.description}
                </>
              )}
            </p>
            <div className="flex items-center gap-3 pt-2">
              {socialLinks.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    target="_blank"
                    className={cn('transition-transform hover:scale-110', item.color)}
                    title={item.label}
                  >
                    <IconComponent className="h-5 w-5" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 연락처 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">연락처</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {profile?.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>{profile.address}</span>
                </li>
              )}
              {profile?.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <span>{profile.phone}</span>
                </li>
              )}
              {profile?.email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <span>{profile.email}</span>
                </li>
              )}
              {profile?.hours && (
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <span>{profile.hours}</span>
                </li>
              )}
              {!profile?.address && !profile?.phone && !profile?.email && !profile?.hours && (
                <li className="text-muted-foreground/50">설정에서 연락처 정보를 입력하세요</li>
              )}
            </ul>
          </div>

          {/* 바로가기 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">바로가기</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={basePath || '/'} className="text-muted-foreground hover:text-primary transition-colors">
                  대시보드
                </Link>
              </li>
              <li>
                <Link href={`${basePath}/pulse`} className="text-muted-foreground hover:text-primary transition-colors">
                  인사이트
                </Link>
              </li>
              <li>
                <Link href={`${basePath}/studio`} className="text-muted-foreground hover:text-primary transition-colors">
                  스튜디오
                </Link>
              </li>
              <li>
                <Link href={`${basePath}/policy`} className="text-muted-foreground hover:text-primary transition-colors">
                  정책연구
                </Link>
              </li>
              <li>
                <Link href={`${basePath}/ops`} className="text-muted-foreground hover:text-primary transition-colors">
                  운영관리
                </Link>
              </li>
              <li>
                <Link href={`${basePath}/hub`} className="text-muted-foreground hover:text-primary transition-colors">
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
                  <Monitor className="h-4 w-4" />
                </Button>
              </div>
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
              <p>© {new Date().getFullYear()} {profile?.candidateName || '후보자명'} {profile?.orgName || '선거대책본부'}. All rights reserved.</p>
              <p className="mt-1">
                본 사이트는 공직선거법에 따라 운영됩니다. | 선거비용 제한액 준수
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link href={`${basePath}/privacy`} className="hover:text-primary transition-colors">
                개인정보처리방침
              </Link>
              <Link href={`${basePath}/terms`} className="hover:text-primary transition-colors">
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
