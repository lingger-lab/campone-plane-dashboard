'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  ExternalLink,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const policies = [
  {
    id: '1',
    category: '경제',
    title: '청년 일자리 100만개 창출',
    status: 'approved',
    completeness: 95,
    evidences: 8,
    questions: 3,
  },
  {
    id: '2',
    category: '경제',
    title: '소상공인 지원 확대',
    status: 'approved',
    completeness: 90,
    evidences: 6,
    questions: 2,
  },
  {
    id: '3',
    category: '교육',
    title: '무상교육 확대',
    status: 'review',
    completeness: 75,
    evidences: 5,
    questions: 4,
  },
  {
    id: '4',
    category: '복지',
    title: '기초연금 인상',
    status: 'review',
    completeness: 70,
    evidences: 4,
    questions: 2,
  },
  {
    id: '5',
    category: '환경',
    title: '탄소중립 2050',
    status: 'draft',
    completeness: 50,
    evidences: 3,
    questions: 5,
  },
  {
    id: '6',
    category: '안전',
    title: '재난대응 시스템 강화',
    status: 'draft',
    completeness: 45,
    evidences: 2,
    questions: 1,
  },
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved':
      return <CheckCircle2 className="h-5 w-5 text-success" />;
    case 'review':
      return <Clock className="h-5 w-5 text-warning" />;
    case 'draft':
      return <Circle className="h-5 w-5 text-muted-foreground" />;
    default:
      return <Circle className="h-5 w-5" />;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'approved':
      return '승인됨';
    case 'review':
      return '검토중';
    case 'draft':
      return '초안';
    default:
      return status;
  }
};

export default function PolicyManagePage() {
  const params = useParams();
  const tenant = params.tenant as string;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(policies.map((p) => p.category))];

  const filteredPolicies = policies.filter((p) => {
    if (selectedCategory && p.category !== selectedCategory) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const avgCompleteness = Math.round(
    policies.reduce((sum, p) => sum + p.completeness, 0) / policies.length
  );

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/${tenant}/policy`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Policy Lab 관리</h1>
            <p className="text-muted-foreground">공약 및 정책 관리</p>
          </div>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          새 공약
        </Button>
      </div>

      {/* KPI 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-success">{avgCompleteness}%</div>
            <div className="text-sm text-muted-foreground">평균 완성도</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold">
              {policies.filter((p) => p.status === 'approved').length}
            </div>
            <div className="text-sm text-muted-foreground">승인된 공약</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-warning">
              {policies.filter((p) => p.status === 'review').length}
            </div>
            <div className="text-sm text-muted-foreground">검토 대기</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold">
              {policies.reduce((sum, p) => sum + p.questions, 0)}
            </div>
            <div className="text-sm text-muted-foreground">시민 질문</div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            전체
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="공약 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* 공약 목록 */}
      <div className="space-y-4">
        {filteredPolicies.map((policy) => (
          <Card key={policy.id} className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {getStatusIcon(policy.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{policy.category}</Badge>
                    <h3 className="font-semibold truncate">{policy.title}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{getStatusLabel(policy.status)}</span>
                    <span>•</span>
                    <span>근거 {policy.evidences}건</span>
                    <span>•</span>
                    <span>질문 {policy.questions}건</span>
                  </div>
                </div>

                {/* 완성도 */}
                <div className="hidden sm:flex items-center gap-3 w-32">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        policy.completeness >= 80 && 'bg-success',
                        policy.completeness >= 50 && policy.completeness < 80 && 'bg-warning',
                        policy.completeness < 50 && 'bg-danger'
                      )}
                      style={{ width: `${policy.completeness}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-10">{policy.completeness}%</span>
                </div>

                {/* 액션 */}
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
