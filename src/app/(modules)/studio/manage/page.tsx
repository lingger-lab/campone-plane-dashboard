'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Search,
  Grid,
  List,
  Calendar,
  Image,
  FileText,
  Video,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  PenTool,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list' | 'calendar';
type ContentType = 'all' | 'card' | 'notice' | 'press' | 'script';

const contentItems = [
  {
    id: '1',
    title: '청년 일자리 정책 카드',
    type: 'card',
    status: 'published',
    thumbnail: null,
    updatedAt: '2025-01-10',
    views: 1250,
  },
  {
    id: '2',
    title: '타운홀 미팅 공지',
    type: 'notice',
    status: 'published',
    thumbnail: null,
    updatedAt: '2025-01-09',
    views: 890,
  },
  {
    id: '3',
    title: '경제 비전 보도자료',
    type: 'press',
    status: 'draft',
    thumbnail: null,
    updatedAt: '2025-01-08',
    views: 0,
  },
  {
    id: '4',
    title: '출정식 연설문',
    type: 'script',
    status: 'review',
    thumbnail: null,
    updatedAt: '2025-01-10',
    views: 0,
  },
  {
    id: '5',
    title: '교육 정책 인포그래픽',
    type: 'card',
    status: 'scheduled',
    thumbnail: null,
    updatedAt: '2025-01-10',
    views: 0,
  },
  {
    id: '6',
    title: '주간 캠페인 소식',
    type: 'notice',
    status: 'draft',
    thumbnail: null,
    updatedAt: '2025-01-07',
    views: 0,
  },
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'card':
      return <Image className="h-4 w-4" />;
    case 'notice':
      return <FileText className="h-4 w-4" />;
    case 'press':
      return <FileText className="h-4 w-4" />;
    case 'script':
      return <Video className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'published':
      return <Badge variant="success">게시됨</Badge>;
    case 'draft':
      return <Badge variant="secondary">초안</Badge>;
    case 'review':
      return <Badge variant="warning">검토중</Badge>;
    case 'scheduled':
      return <Badge variant="info">예약됨</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

export default function StudioManagePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [contentType, setContentType] = useState<ContentType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = contentItems.filter((item) => {
    if (contentType !== 'all' && item.type !== contentType) return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/studio">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Studio 관리</h1>
            <p className="text-muted-foreground">콘텐츠 제작 및 관리</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/studio/banners">
              <PenTool className="mr-2 h-4 w-4" />
              현수막 디자인
            </Link>
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            새 콘텐츠
          </Button>
        </div>
      </div>

      {/* KPI 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">24</div>
            <div className="text-sm text-muted-foreground">게시됨</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold">8</div>
            <div className="text-sm text-muted-foreground">준비중</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold">3</div>
            <div className="text-sm text-muted-foreground">예약됨</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-success">85%</div>
            <div className="text-sm text-muted-foreground">준비율</div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 & 검색 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: '전체' },
            { key: 'card', label: '카드' },
            { key: 'notice', label: '공지' },
            { key: 'press', label: '보도자료' },
            { key: 'script', label: '스크립트' },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={contentType === tab.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setContentType(tab.key as ContentType)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-none border-x"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-l-none"
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 콘텐츠 그리드 */}
      {viewMode === 'grid' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="group overflow-hidden card-hover">
              <div className="aspect-video bg-secondary flex items-center justify-center">
                {getTypeIcon(item.type)}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.updatedAt}</p>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
                <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-1" />
                    보기
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4 mr-1" />
                    편집
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 콘텐츠 리스트 */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">제목</th>
                  <th className="text-left p-4 font-medium">유형</th>
                  <th className="text-left p-4 font-medium">상태</th>
                  <th className="text-left p-4 font-medium">수정일</th>
                  <th className="text-left p-4 font-medium">조회</th>
                  <th className="text-right p-4 font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {getTypeIcon(item.type)}
                        <span className="font-medium">{item.title}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground capitalize">{item.type}</td>
                    <td className="p-4">{getStatusBadge(item.status)}</td>
                    <td className="p-4 text-muted-foreground">{item.updatedAt}</td>
                    <td className="p-4 text-muted-foreground">{item.views.toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 캘린더 뷰 */}
      {viewMode === 'calendar' && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground py-12">
              캘린더 뷰는 준비 중입니다
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
