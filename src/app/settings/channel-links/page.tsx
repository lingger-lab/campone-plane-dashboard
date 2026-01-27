'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  Edit2,
  Check,
  X,
  Save,
  RefreshCw,
  AlertCircle,
  Link as LinkIcon,
  ChevronLeft,
  Plus,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { SiYoutube, SiKakaotalk, SiInstagram, SiNaver } from 'react-icons/si';
import { PenTool } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useChannels, useSaveChannels, ChannelLink, getChannelIconColor } from '@/hooks/useChannels';
import { hasPermission } from '@/lib/rbac';
import type { UserRole } from '@/lib/types';

// 아이콘 키 → 컴포넌트 매핑
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  youtube: SiYoutube,
  kakao: SiKakaotalk,
  instagram: SiInstagram,
  naver: SiNaver,
  banner: PenTool,
};

const ICON_OPTIONS = ['youtube', 'kakao', 'instagram', 'naver', 'banner'];

function renderIcon(iconKey: string) {
  const IconComponent = iconMap[iconKey] || LinkIcon;
  const color = getChannelIconColor(iconKey);
  return <IconComponent className={cn('h-4 w-4', color)} />;
}

export default function ChannelLinksPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: UserRole })?.role || 'Viewer';
  const canEdit = hasPermission(userRole, 'channels', 'update');

  const { data: channelsData, isLoading, isError, refetch } = useChannels();
  const saveChannels = useSaveChannels();

  const [channels, setChannels] = useState<ChannelLink[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // 다이얼로그 상태
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChannelLink | null>(null);
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);

  // 폼 상태
  const [formKey, setFormKey] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formIcon, setFormIcon] = useState('none');

  // 서버 데이터로 로컬 상태 초기화
  useEffect(() => {
    if (channelsData?.channels) {
      setChannels(channelsData.channels);
      setHasChanges(false);
    }
  }, [channelsData]);

  // 다이얼로그 열기 (새로 만들기)
  const openCreateDialog = () => {
    setEditingChannel(null);
    setFormKey('');
    setFormLabel('');
    setFormUrl('');
    setFormIcon('none');
    setDialogOpen(true);
  };

  // 다이얼로그 열기 (수정)
  const openEditDialog = (channel: ChannelLink) => {
    setEditingChannel(channel);
    setFormKey(channel.key);
    setFormLabel(channel.label);
    setFormUrl(channel.url);
    setFormIcon(channel.icon || 'none');
    setDialogOpen(true);
  };

  // 저장
  const handleSave = () => {
    if (!formLabel.trim() || !formUrl.trim()) return;

    if (editingChannel) {
      // 수정
      setChannels((prev) =>
        prev.map((ch) =>
          ch.key === editingChannel.key
            ? {
                ...ch,
                label: formLabel,
                url: formUrl,
                icon: formIcon !== 'none' ? formIcon : undefined,
              }
            : ch
        )
      );
    } else {
      // 새로 만들기
      const newKey = formKey.trim() || `custom-${Date.now()}`;
      const newChannel: ChannelLink = {
        key: newKey,
        label: formLabel,
        url: formUrl,
        icon: formIcon !== 'none' ? formIcon : undefined,
        visible: true,
        order: channels.length,
      };
      setChannels((prev) => [...prev, newChannel]);
    }

    setDialogOpen(false);
    setHasChanges(true);
  };

  // 삭제
  const handleDelete = (key: string) => {
    setChannels((prev) => prev.filter((ch) => ch.key !== key));
    setDeleteConfirmKey(null);
    setHasChanges(true);
  };

  // 표시/숨기기 토글
  const toggleVisibility = (key: string) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.key === key ? { ...ch, visible: !ch.visible } : ch))
    );
    setHasChanges(true);
  };

  // 순서 변경
  const moveChannel = (index: number, direction: 'up' | 'down') => {
    const newChannels = [...channels];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newChannels.length) return;

    [newChannels[index], newChannels[targetIndex]] = [newChannels[targetIndex], newChannels[index]];

    // order 재정렬
    newChannels.forEach((ch, i) => {
      ch.order = i;
    });

    setChannels(newChannels);
    setHasChanges(true);
  };

  // 서버에 저장
  const handleSaveToServer = async () => {
    try {
      await saveChannels.mutateAsync(channels);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save channels:', error);
    }
  };

  // 변경사항 되돌리기
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
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">채널 링크 관리</h1>
            <p className="text-muted-foreground">사이드바에 표시되는 외부 채널 링크</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!canEdit && <Badge variant="secondary">읽기 전용</Badge>}
          {canEdit && hasChanges && (
            <>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <X className="h-4 w-4 mr-1" />
                되돌리기
              </Button>
              <Button size="sm" onClick={handleSaveToServer} disabled={saveChannels.isPending}>
                {saveChannels.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                저장
              </Button>
            </>
          )}
          {canEdit && (
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              새 채널 추가
            </Button>
          )}
        </div>
      </div>

      {/* 안내 메시지 */}
      {canEdit && (
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
          채널 링크를 추가, 수정, 삭제하거나 표시 순서를 변경할 수 있습니다.
          변경사항이 있으면 상단의 저장 버튼을 눌러 저장하세요.
        </div>
      )}

      {/* 채널 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">채널 목록</CardTitle>
          <CardDescription>
            {canEdit
              ? '순서를 변경하거나 채널을 클릭하여 수정하세요.'
              : '채널 링크 목록입니다.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {channels.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              등록된 채널이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {channels.map((channel, index) => {
                const IconComponent = iconMap[channel.icon || ''] || LinkIcon;
                const iconColor = getChannelIconColor(channel.icon);

                return (
                  <div
                    key={channel.key}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors',
                      !channel.visible && 'opacity-50'
                    )}
                  >
                    {/* 순서 변경 버튼 */}
                    {canEdit && (
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => moveChannel(index, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronLeft className="h-3 w-3 rotate-90" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => moveChannel(index, 'down')}
                          disabled={index === channels.length - 1}
                        >
                          <ChevronLeft className="h-3 w-3 -rotate-90" />
                        </Button>
                      </div>
                    )}

                    {/* 아이콘 */}
                    <div className={cn('p-2 rounded-lg bg-muted', iconColor)}>
                      <IconComponent className="h-5 w-5" />
                    </div>

                    {/* 라벨 & URL */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{channel.label}</span>
                        {!channel.visible && <Badge variant="secondary">비공개</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{channel.url}</p>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex gap-1 shrink-0">
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
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(channel)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmKey(channel.key)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button variant="outline" size="icon" asChild>
                        <a href={channel.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 권한 안내 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">권한 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Admin, Manager:</strong> 채널 링크 추가, 수정, 삭제 및 순서 변경 가능
            </p>
            <p>
              <strong>Staff, Viewer:</strong> 채널 링크 목록 조회만 가능
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 편집 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingChannel ? '채널 수정' : '새 채널 추가'}
            </DialogTitle>
            <DialogDescription>
              {editingChannel
                ? '채널 정보를 수정합니다.'
                : '사이드바에 표시될 새 채널을 추가합니다.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!editingChannel && (
              <div>
                <label className="text-sm font-medium mb-1 block">키 (선택)</label>
                <Input
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  placeholder="예: twitter (비워두면 자동 생성)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  고유 식별자입니다. 영문 소문자로 입력하세요.
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">채널명 *</label>
              <Input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="예: 트위터"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">URL *</label>
              <Input
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="예: https://twitter.com/username"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">아이콘</label>
              <Select value={formIcon} onValueChange={setFormIcon}>
                <SelectTrigger>
                  <SelectValue placeholder="아이콘 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      <span>기본</span>
                    </div>
                  </SelectItem>
                  {ICON_OPTIONS.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      <div className="flex items-center gap-2">
                        {renderIcon(icon)}
                        <span>{icon}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={!formLabel.trim() || !formUrl.trim()}>
              {editingChannel ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteConfirmKey} onOpenChange={() => setDeleteConfirmKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>채널 삭제</DialogTitle>
            <DialogDescription>
              이 채널을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmKey(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmKey && handleDelete(deleteConfirmKey)}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
