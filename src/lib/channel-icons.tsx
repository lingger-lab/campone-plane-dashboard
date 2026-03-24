import {
  SiYoutube,
  SiKakaotalk,
  SiInstagram,
  SiNaver,
  SiFacebook,
  SiTiktok,
  SiThreads,
  SiX,
  SiTelegram,
} from 'react-icons/si';
import { PenTool, Link as LinkIcon, Globe } from 'lucide-react';
import type { ComponentType } from 'react';

interface ChannelIconInfo {
  icon: ComponentType<{ className?: string }>;
  color: string;       // 텍스트 컬러 (아이콘 색)
  bg: string;          // 배경 컬러
  label: string;       // 기본 라벨 (신규 채널 추가 시 참고)
}

/**
 * 채널 키 → 아이콘 정보 매핑
 *
 * 새 SNS를 추가하려면 여기에 항목만 추가하면
 * 사이드바, 채널 관리 페이지 모두에 자동 반영됩니다.
 */
export const CHANNEL_ICONS: Record<string, ChannelIconInfo> = {
  youtube: {
    icon: SiYoutube,
    color: 'text-[#FF0000]',
    bg: 'bg-[#FF0000]/10',
    label: 'YouTube',
  },
  kakao: {
    icon: SiKakaotalk,
    color: 'text-[#FEE500] dark:text-[#FEE500]',
    bg: 'bg-[#FEE500]/15',
    label: 'KakaoTalk',
  },
  instagram: {
    icon: SiInstagram,
    color: 'text-[#E4405F]',
    bg: 'bg-[#E4405F]/10',
    label: 'Instagram',
  },
  naver: {
    icon: SiNaver,
    color: 'text-[#03C75A]',
    bg: 'bg-[#03C75A]/10',
    label: 'Naver Blog',
  },
  naverCafe: {
    icon: SiNaver,
    color: 'text-[#03C75A]',
    bg: 'bg-[#03C75A]/10',
    label: 'Naver Cafe',
  },
  facebook: {
    icon: SiFacebook,
    color: 'text-[#1877F2]',
    bg: 'bg-[#1877F2]/10',
    label: 'Facebook',
  },
  twitter: {
    icon: SiX,
    color: 'text-[#000000] dark:text-[#FFFFFF]',
    bg: 'bg-[#000000]/10 dark:bg-[#FFFFFF]/10',
    label: 'X (Twitter)',
  },
  x: {
    icon: SiX,
    color: 'text-[#000000] dark:text-[#FFFFFF]',
    bg: 'bg-[#000000]/10 dark:bg-[#FFFFFF]/10',
    label: 'X',
  },
  tiktok: {
    icon: SiTiktok,
    color: 'text-[#000000] dark:text-[#FFFFFF]',
    bg: 'bg-[#000000]/10 dark:bg-[#FFFFFF]/10',
    label: 'TikTok',
  },
  threads: {
    icon: SiThreads,
    color: 'text-[#000000] dark:text-[#FFFFFF]',
    bg: 'bg-[#000000]/10 dark:bg-[#FFFFFF]/10',
    label: 'Threads',
  },
  telegram: {
    icon: SiTelegram,
    color: 'text-[#26A5E4]',
    bg: 'bg-[#26A5E4]/10',
    label: 'Telegram',
  },
  band: {
    icon: Globe,
    color: 'text-[#06CF9C]',
    bg: 'bg-[#06CF9C]/10',
    label: 'BAND',
  },
  banner: {
    icon: PenTool,
    color: 'text-primary',
    bg: 'bg-primary/10',
    label: '현수막 디자인',
  },
  website: {
    icon: Globe,
    color: 'text-primary',
    bg: 'bg-primary/10',
    label: '웹사이트',
  },
};

const DEFAULT_ICON: ChannelIconInfo = {
  icon: LinkIcon,
  color: 'text-muted-foreground',
  bg: 'bg-muted',
  label: '링크',
};

/** 채널 키로 아이콘 컴포넌트 가져오기 */
export function getChannelIcon(key?: string): ComponentType<{ className?: string }> {
  return CHANNEL_ICONS[key || '']?.icon || DEFAULT_ICON.icon;
}

/** 채널 키로 아이콘 텍스트 컬러 가져오기 */
export function getChannelIconColor(key?: string): string {
  return CHANNEL_ICONS[key || '']?.color || DEFAULT_ICON.color;
}

/** 채널 키로 배경 컬러 가져오기 */
export function getChannelIconBg(key?: string): string {
  return CHANNEL_ICONS[key || '']?.bg || DEFAULT_ICON.bg;
}
