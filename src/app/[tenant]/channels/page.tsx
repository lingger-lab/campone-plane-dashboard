'use client';

import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  Edit2,
  Check,
  X,
  Save,
  RefreshCw,
  AlertCircle,
  Link as LinkIcon,
} from 'lucide-react';
import { SiYoutube, SiKakaotalk, SiInstagram, SiNaver } from 'react-icons/si';
import { PenTool } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useChannels, useSaveChannels, ChannelLink, getChannelIconColor } from '@/hooks/useChannels';
import { canEdit as canEditRole } from '@/lib/rbac';

// 아이콘 키 → 컴포넌트 매핑
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  youtube: SiYoutube,
  kakao: SiKakaotalk,
  instagram: SiInstagram,
  naver: SiNaver,
  banner: PenTool,
};

export default function ChannelsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role || 'viewer';
  const canEdit = canEditRole(userRole);

  const { data: channelsData, isLoading, isError, refetch } = useChannels();
  const saveChannels = useSaveChannels();

  const [channels, setChannels] = useState<ChannelLink[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // 서버 데이터로 로컬 상태 초기화
  useEffect(() => {
    if (channelsData?.channels) {
      setChannels(channelsData.channels);
      setHasChanges(false);
    }
  }, [channelsData]);

  const startEdit = (channel: ChannelLink) => {
    if (!canEdit) return;
    setEditingKey(channel.key);
    setEditUrl(channel.url);
  };

  const saveEdit = (key: string) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.key === key ? { ...ch, url: editUrl } : ch))
    );
    setEditingKey(null);
    setHasChanges(true);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditUrl('');
  };

  const toggleVisibility = (key: string) => {
    if (!canEdit) return;
    setChannels((prev) =>
      prev.map((ch) => (ch.key === key ? { ...ch, visible: !ch.visible } : ch))
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await saveChannels.mutateAsync(channels);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save channels:', error);
    }
  };

  const handleReset = () => {
    if (channelsData?.channels) {
      setChannels(channelsData.channels);
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-muted-foreground">채널 정보를 불러올 수 없습니다</p>
          <Button variant="outline" onClick={() => refetch()}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">채널 링크</h1>
          <p className="text-muted-foreground">외부 채널 링크 관리</p>
        </div>
        <div className="flex items-center gap-2">
          {!canEdit && (
            <Badge variant="secondary">읽기 전용</Badge>
          )}
          {canEdit && hasChanges && (
            <>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <X className="h-4 w-4 mr-1" />
                되돌리기
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saveChannels.isPending}
              >
                {saveChannels.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                저장
              </Button>
            </>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
          채널 링크를 수정하면 사이드바에 즉시 반영됩니다.
          변경사항이 있으면 상단의 저장 버튼을 눌러 저장하세요.
        </div>
      )}

      <div className="grid gap-4">
        {channels.map((channel) => {
          const IconComponent = iconMap[channel.icon || ''] || LinkIcon;
          const iconColor = getChannelIconColor(channel.icon);

          return (
            <Card key={channel.key} className={cn(!channel.visible && 'opacity-50')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={cn('p-3 rounded-xl bg-muted', iconColor)}>
                    <IconComponent className="h-6 w-6" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{channel.label}</h3>
                      {!channel.visible && (
                        <Badge variant="secondary">비공개</Badge>
                      )}
                    </div>

                    {editingKey === channel.key ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          className="flex-1"
                          placeholder="URL 입력"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => saveEdit(channel.key)}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={cancelEdit}>
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground truncate">
                        {channel.url}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleVisibility(channel.key)}
                        >
                          {channel.visible ? '숨기기' : '표시'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(channel)}
                          disabled={editingKey === channel.key}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <a href={channel.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">권한 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>관리자, 편집자:</strong> 채널 링크 URL 수정 및 표시/숨기기 설정 가능
            </p>
            <p>
              <strong>뷰어:</strong> 채널 링크 목록 조회만 가능
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
