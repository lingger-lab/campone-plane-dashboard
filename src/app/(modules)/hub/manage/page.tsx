'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Search,
  Users,
  Send,
  Mail,
  MessageCircle,
  BarChart3,
  Inbox,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Tab = 'segments' | 'campaigns' | 'messages' | 'inbox';

const segments = [
  { id: 's001', name: '서울 지지자', size: 1240, criteria: '서울 + 지지자' },
  { id: 's002', name: '후원자 전체', size: 320, criteria: '후원자 태그' },
  { id: 's003', name: '자원봉사자', size: 580, criteria: '자원봉사 태그' },
  { id: 's004', name: '스윙보터', size: 890, criteria: '스윙보터 태그' },
  { id: 's005', name: '수도권 전체', size: 2150, criteria: '서울/경기/인천' },
];

const campaigns = [
  { id: 'c001', name: '타운홀 초대', status: 'scheduled', sent: 0, opened: 0, segment: '서울 지지자' },
  { id: 'c002', name: '공약 안내', status: 'sent', sent: 1500, opened: 620, segment: '후원자 전체' },
  { id: 'c003', name: '출정식 알림', status: 'draft', sent: 0, opened: 0, segment: '수도권 전체' },
];

const inboxItems = [
  { id: 'i001', from: '김민수', subject: '청년 정책 문의', status: 'new', time: '10분 전' },
  { id: 'i002', from: '박서연', subject: '자원봉사 신청', status: 'new', time: '30분 전' },
  { id: 'i003', from: '이지후', subject: '후원 방법 문의', status: 'replied', time: '1시간 전' },
  { id: 'i004', from: '최하린', subject: '행사 일정 확인', status: 'replied', time: '2시간 전' },
];

export default function HubManagePage() {
  const [activeTab, setActiveTab] = useState<Tab>('segments');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { key: 'segments', label: '세그먼트', icon: Users },
    { key: 'campaigns', label: '캠페인', icon: Send },
    { key: 'messages', label: '메시지', icon: MessageCircle },
    { key: 'inbox', label: '인바운드', icon: Inbox, badge: 2 },
  ];

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/hub">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Civic Hub 관리</h1>
            <p className="text-muted-foreground">세그먼트, 캠페인, 메시지 관리</p>
          </div>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          새 캠페인
        </Button>
      </div>

      {/* 퍼널 KPI */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center">
              <div className="text-3xl font-bold">2,680</div>
              <div className="text-sm text-muted-foreground">발송</div>
            </div>
            <div className="text-2xl text-muted-foreground">→</div>
            <div className="flex-1 text-center">
              <div className="text-3xl font-bold">2,640</div>
              <div className="text-sm text-muted-foreground">도달</div>
              <div className="text-xs text-success">98.5%</div>
            </div>
            <div className="text-2xl text-muted-foreground">→</div>
            <div className="flex-1 text-center">
              <div className="text-3xl font-bold text-primary">1,200</div>
              <div className="text-sm text-muted-foreground">오픈</div>
              <div className="text-xs text-success">45%</div>
            </div>
            <div className="text-2xl text-muted-foreground">→</div>
            <div className="flex-1 text-center">
              <div className="text-3xl font-bold text-success">320</div>
              <div className="text-sm text-muted-foreground">응답</div>
              <div className="text-xs text-success">12%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 탭 네비게이션 */}
      <div className="flex items-center justify-between border-b">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'default' : 'ghost'}
              className={cn(
                'rounded-b-none',
                activeTab === tab.key && 'bg-primary'
              )}
              onClick={() => setActiveTab(tab.key as Tab)}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
              {tab.badge && (
                <Badge variant="destructive" className="ml-2">
                  {tab.badge}
                </Badge>
              )}
            </Button>
          ))}
        </div>
        <div className="relative w-64 mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* 세그먼트 탭 */}
      {activeTab === 'segments' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map((seg) => (
            <Card key={seg.id} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{seg.name}</h3>
                    <p className="text-sm text-muted-foreground">{seg.criteria}</p>
                  </div>
                  <Badge variant="secondary">{seg.size.toLocaleString()}명</Badge>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1">
                    편집
                  </Button>
                  <Button size="sm" className="flex-1">
                    메시지 보내기
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="border-dashed flex items-center justify-center min-h-[140px] card-hover cursor-pointer">
            <CardContent className="text-center text-muted-foreground">
              <Plus className="h-8 w-8 mx-auto mb-2" />
              <p>새 세그먼트</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 캠페인 탭 */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{campaign.name}</h3>
                      <Badge
                        variant={
                          campaign.status === 'sent'
                            ? 'success'
                            : campaign.status === 'scheduled'
                            ? 'info'
                            : 'secondary'
                        }
                      >
                        {campaign.status === 'sent'
                          ? '발송완료'
                          : campaign.status === 'scheduled'
                          ? '예약됨'
                          : '초안'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      세그먼트: {campaign.segment}
                    </p>
                  </div>
                  <div className="text-center px-4">
                    <div className="text-xl font-bold">{campaign.sent.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">발송</div>
                  </div>
                  <div className="text-center px-4">
                    <div className="text-xl font-bold text-primary">
                      {campaign.opened.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">오픈</div>
                  </div>
                  <div className="text-center px-4">
                    <div className="text-xl font-bold">
                      {campaign.sent > 0
                        ? `${Math.round((campaign.opened / campaign.sent) * 100)}%`
                        : '-'}
                    </div>
                    <div className="text-xs text-muted-foreground">오픈율</div>
                  </div>
                  <Button variant="outline">상세</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 메시지 탭 */}
      {activeTab === 'messages' && (
        <Card>
          <CardHeader>
            <CardTitle>메시지 에디터</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              세그먼트를 선택하여 메시지를 작성하세요
            </div>
          </CardContent>
        </Card>
      )}

      {/* 인바운드 탭 */}
      {activeTab === 'inbox' && (
        <div className="space-y-3">
          {inboxItems.map((item) => (
            <Card
              key={item.id}
              className={cn('card-hover', item.status === 'new' && 'border-primary')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      item.status === 'new' ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.from}</span>
                      {item.status === 'new' && <Badge variant="default">새 메시지</Badge>}
                    </div>
                    <p className="text-muted-foreground">{item.subject}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{item.time}</span>
                  <Button variant="outline" size="sm">
                    {item.status === 'new' ? '답변하기' : '보기'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
