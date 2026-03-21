'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Plus, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ── 타입 ────────────────────────────────────────────────────────────────────

type InquiryStatus = 'OPEN' | 'REPLIED' | 'CLOSED';
type InquiryCategory = 'general' | 'bug' | 'feature' | 'question';

interface Inquiry {
  id: number;
  category: InquiryCategory;
  title: string;
  content: string;
  status: InquiryStatus;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  userName?: string;
}

interface InquiriesResponse {
  items: Inquiry[];
  total: number;
  page: number;
  pageSize: number;
}

// ── 상수 ────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<InquiryCategory, string> = {
  general: '일반',
  bug: '버그',
  feature: '기능 요청',
  question: '질문',
};

const CATEGORY_COLORS: Record<InquiryCategory, string> = {
  general: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  bug: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  feature: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  question: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const STATUS_LABELS: Record<InquiryStatus, string> = {
  OPEN: '답변대기',
  REPLIED: '답변완료',
  CLOSED: '종료',
};

const STATUS_COLORS: Record<InquiryStatus, string> = {
  OPEN: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  REPLIED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CLOSED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

// ── API ─────────────────────────────────────────────────────────────────────

async function fetchInquiries(status?: InquiryStatus): Promise<InquiriesResponse> {
  const params = new URLSearchParams({ pageSize: '50' });
  if (status) params.set('status', status);
  const res = await fetch(`/api/inquiries?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '문의 목록을 가져올 수 없습니다.');
  }
  return res.json();
}

async function submitInquiry(body: {
  category: InquiryCategory;
  title: string;
  content: string;
}): Promise<{ ok: true; id: number }> {
  const res = await fetch('/api/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '문의 제출에 실패했습니다.');
  }
  return res.json();
}

// ── 날짜 포맷 ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

type FilterType = 'ALL' | InquiryStatus;

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'OPEN', label: '답변대기' },
  { value: 'REPLIED', label: '답변완료' },
  { value: 'CLOSED', label: '종료' },
];

export default function InquiriesPage() {
  const queryClient = useQueryClient();

  // 목록 상태
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 새 문의 폼 상태
  const [formOpen, setFormOpen] = useState(false);
  const [formCategory, setFormCategory] = useState<InquiryCategory>('general');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formError, setFormError] = useState('');

  // 목록 조회
  const statusFilter = filter === 'ALL' ? undefined : filter;
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['inquiries', filter],
    queryFn: () => fetchInquiries(statusFilter),
  });

  // 제출 mutation
  const mutation = useMutation({
    mutationFn: submitInquiry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
      setFormOpen(false);
      setFormTitle('');
      setFormContent('');
      setFormCategory('general');
      setFormError('');
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formTitle.trim()) { setFormError('제목을 입력해주세요.'); return; }
    if (!formContent.trim()) { setFormError('내용을 입력해주세요.'); return; }
    mutation.mutate({ category: formCategory, title: formTitle.trim(), content: formContent.trim() });
  };

  const items = data?.items ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">문의 / 건의</h1>
            <p className="text-sm text-muted-foreground">문의를 제출하고 답변을 확인하세요</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
          <Button size="sm" onClick={() => { setFormOpen(true); setFormError(''); }}>
            <Plus className="h-4 w-4 mr-1" />
            새 문의
          </Button>
        </div>
      </div>

      {/* 새 문의 폼 */}
      {formOpen && (
        <Card className="mb-6 border-primary/30">
          <CardContent className="pt-5">
            <h2 className="font-medium mb-4">새 문의 작성</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* 카테고리 */}
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(CATEGORY_LABELS) as InquiryCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormCategory(cat)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                      formCategory === cat
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:bg-muted'
                    )}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>

              <Input
                placeholder="제목 (최대 300자)"
                maxLength={300}
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />

              <textarea
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                placeholder="내용 (최대 5000자)"
                maxLength={5000}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
              />

              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setFormOpen(false); setFormError(''); }}
                >
                  취소
                </Button>
                <Button type="submit" size="sm" disabled={mutation.isPending}>
                  {mutation.isPending ? '제출 중...' : '제출'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 필터 탭 */}
      <div className="flex gap-1 mb-4 border-b">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setFilter(value); setExpandedId(null); }}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              filter === value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {isLoading && (
        <div className="flex justify-center py-12 text-muted-foreground text-sm">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" /> 불러오는 중...
        </div>
      )}

      {isError && (
        <div className="text-center py-12 text-destructive text-sm">
          목록을 불러오지 못했습니다.
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {filter === 'ALL' ? '접수된 문의가 없습니다.' : '해당 상태의 문의가 없습니다.'}
        </div>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <Card key={item.id} className="overflow-hidden">
                {/* 행 헤더 (클릭 시 펼침) */}
                <button
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn('shrink-0 px-2 py-0.5 rounded-full text-xs font-medium', CATEGORY_COLORS[item.category])}>
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      <span className="truncate text-sm font-medium">{item.title}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {item.userName && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {item.userName}
                        </span>
                      )}
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[item.status])}>
                        {STATUS_LABELS[item.status]}
                      </span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {formatDate(item.createdAt)}
                      </span>
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                  </div>
                </button>

                {/* 상세 펼침 */}
                {isExpanded && (
                  <div className="border-t px-4 py-4 space-y-4">
                    {/* 원본 문의 */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        문의 내용
                        {item.userName && (
                          <span className="ml-2 font-medium text-foreground">{item.userName}</span>
                        )}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                    </div>

                    {/* 답변 */}
                    {item.reply ? (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md px-4 py-3 border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-600 dark:text-blue-400 mb-1 font-medium">
                          관리자 답변
                          {item.repliedAt && (
                            <span className="font-normal ml-2">{formatDate(item.repliedAt)}</span>
                          )}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{item.reply}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">아직 답변이 등록되지 않았습니다.</p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* 총 건수 */}
      {data && data.total > 0 && (
        <p className="text-xs text-muted-foreground text-right mt-4">
          총 {data.total}건
        </p>
      )}
    </div>
  );
}
