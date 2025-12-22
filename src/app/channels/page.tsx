'use client';

import React, { useState } from 'react';
import {
  Youtube,
  MessageCircle,
  Instagram,
  FileText,
  ExternalLink,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Channel {
  key: string;
  label: string;
  url: string;
  icon: React.ElementType;
  color: string;
  visible: boolean;
}

const initialChannels: Channel[] = [
  {
    key: 'youtube',
    label: 'YouTube',
    url: 'https://youtube.com/@hongdemo',
    icon: Youtube,
    color: 'text-red-500',
    visible: true,
  },
  {
    key: 'kakao',
    label: 'KakaoTalk 채널',
    url: 'https://pf.kakao.com/_hongdemo',
    icon: MessageCircle,
    color: 'text-yellow-500',
    visible: true,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    url: 'https://instagram.com/hongdemo',
    icon: Instagram,
    color: 'text-pink-500',
    visible: true,
  },
  {
    key: 'naverBlog',
    label: 'Naver Blog',
    url: 'https://blog.naver.com/hongdemo',
    icon: FileText,
    color: 'text-green-500',
    visible: true,
  },
];

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');

  const startEdit = (channel: Channel) => {
    setEditingKey(channel.key);
    setEditUrl(channel.url);
  };

  const saveEdit = (key: string) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.key === key ? { ...ch, url: editUrl } : ch))
    );
    setEditingKey(null);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditUrl('');
  };

  const toggleVisibility = (key: string) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.key === key ? { ...ch, visible: !ch.visible } : ch))
    );
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">채널 링크</h1>
        <p className="text-muted-foreground">외부 채널 링크 관리</p>
      </div>

      <div className="grid gap-4">
        {channels.map((channel) => (
          <Card key={channel.key} className={cn(!channel.visible && 'opacity-50')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={cn('p-3 rounded-xl bg-muted', channel.color)}>
                  <channel.icon className="h-6 w-6" />
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
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => saveEdit(channel.key)}
                      >
                        <Check className="h-4 w-4 text-success" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={cancelEdit}>
                        <X className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground truncate">
                      {channel.url}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
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
                  <Button variant="outline" size="sm" asChild>
                    <a href={channel.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">연결 테스트</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            모든 채널 링크의 연결 상태를 확인합니다
          </p>
          <Button variant="outline">연결 테스트 실행</Button>
        </CardContent>
      </Card>
    </div>
  );
}
