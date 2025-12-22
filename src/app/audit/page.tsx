'use client';

import React, { useState } from 'react';
import { Search, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const auditLogs = [
  {
    id: '1',
    user: '김관리',
    action: 'create',
    module: 'Hub',
    target: '세그먼트: 서울 지지자',
    time: '2025-01-10 10:30',
  },
  {
    id: '2',
    user: '박매니저',
    action: 'update',
    module: 'Studio',
    target: '연설문 초안 v2',
    time: '2025-01-10 09:15',
  },
  {
    id: '3',
    user: '김관리',
    action: 'send',
    module: 'Hub',
    target: '캠페인: 공약 안내',
    time: '2025-01-09 14:00',
  },
  {
    id: '4',
    user: '이스태프',
    action: 'create',
    module: 'Studio',
    target: 'SNS 카드: 청년 정책',
    time: '2025-01-09 11:20',
  },
  {
    id: '5',
    user: '박매니저',
    action: 'approve',
    module: 'Policy',
    target: '공약: 청년 일자리 정책',
    time: '2025-01-09 10:45',
  },
  {
    id: '6',
    user: '김관리',
    action: 'update',
    module: 'System',
    target: '채널 링크: YouTube',
    time: '2025-01-08 16:30',
  },
  {
    id: '7',
    user: '이스태프',
    action: 'create',
    module: 'Ops',
    target: '태스크: 출정식 현수막',
    time: '2025-01-08 14:00',
  },
  {
    id: '8',
    user: '박매니저',
    action: 'delete',
    module: 'Hub',
    target: '연락처: 테스트 계정',
    time: '2025-01-08 11:30',
  },
];

const getActionBadge = (action: string) => {
  switch (action) {
    case 'create':
      return <Badge variant="success">생성</Badge>;
    case 'update':
      return <Badge variant="info">수정</Badge>;
    case 'delete':
      return <Badge variant="danger">삭제</Badge>;
    case 'send':
      return <Badge variant="default">발송</Badge>;
    case 'approve':
      return <Badge variant="warning">승인</Badge>;
    default:
      return <Badge>{action}</Badge>;
  }
};

export default function AuditPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.user.includes(searchQuery) ||
      log.target.includes(searchQuery) ||
      log.module.includes(searchQuery)
  );

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">활동 로그</h1>
          <p className="text-muted-foreground">시스템 감사 추적</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          내보내기
        </Button>
      </div>

      {/* 필터 */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="사용자, 대상, 모듈 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          필터
        </Button>
      </div>

      {/* 로그 테이블 */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium">시간</th>
                <th className="text-left p-4 font-medium">사용자</th>
                <th className="text-left p-4 font-medium">액션</th>
                <th className="text-left p-4 font-medium">모듈</th>
                <th className="text-left p-4 font-medium">대상</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-4 text-muted-foreground text-sm">{log.time}</td>
                  <td className="p-4 font-medium">{log.user}</td>
                  <td className="p-4">{getActionBadge(log.action)}</td>
                  <td className="p-4">
                    <Badge variant="outline">{log.module}</Badge>
                  </td>
                  <td className="p-4 text-muted-foreground">{log.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 페이지네이션 */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filteredLogs.length}개 항목</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            이전
          </Button>
          <Button variant="outline" size="sm">
            다음
          </Button>
        </div>
      </div>
    </div>
  );
}
