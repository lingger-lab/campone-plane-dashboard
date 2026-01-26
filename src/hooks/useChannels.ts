import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ChannelLink {
  key: string;
  url: string;
  label: string;
  icon?: string;
  visible: boolean;
  order: number;
}

interface ChannelsResponse {
  channels: ChannelLink[];
}

// 채널 목록 조회
export function useChannels() {
  return useQuery<ChannelsResponse>({
    queryKey: ['channels'],
    queryFn: async () => {
      const response = await fetch('/api/channels');
      if (!response.ok) {
        throw new Error('Failed to fetch channels');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시
  });
}

// 단일 채널 업데이트
export function useUpdateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channel: Partial<ChannelLink> & { key: string }) => {
      const response = await fetch('/api/channels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channel),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update channel');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

// 채널 일괄 저장
export function useSaveChannels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channels: ChannelLink[]) => {
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save channels');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

// 아이콘 키 → 아이콘 컬러 매핑
export function getChannelIconColor(iconKey?: string): string {
  const colors: Record<string, string> = {
    youtube: 'text-red-600',
    kakao: 'text-yellow-500',
    instagram: 'text-pink-600',
    naver: 'text-[#03C75A]',
    banner: 'text-primary',
  };
  return colors[iconKey || ''] || 'text-muted-foreground';
}
