'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, Download, RefreshCw, X, Bell, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useActivities, formatRelativeTime } from '@/hooks/useActivities';
import { useAlerts, getAlertStyles, Alert } from '@/hooks/useAlerts';
import { cn } from '@/lib/utils';

const MODULES = ['Dashboard', 'Pulse', 'Studio', 'Policy', 'Ops', 'Hub', 'System'];

const getActionBadge = (action: string) => {
  const actionLower = action.toLowerCase();

  // 실패/에러 계열 (먼저 체크 - "분석 실패" 등)
  if (actionLower.includes('실패') || actionLower.includes('fail') ||
      actionLower.includes('error') || actionLower.includes('오류')) {
    return <Badge variant="danger">실패</Badge>;
  }

  // 반려/거절 계열
  if (actionLower.includes('반려') || actionLower.includes('거절') ||
      actionLower.includes('reject') || actionLower.includes('거부')) {
    return <Badge variant="danger">반려</Badge>;
  }

  // 삭제 계열
  if (actionLower.includes('삭제') || actionLower.includes('delete') ||
      actionLower.includes('제거')) {
    return <Badge variant="danger">삭제</Badge>;
  }

  // 다운로드/내보내기 계열 (조회와 분리)
  if (actionLower.includes('다운로드') || actionLower.includes('download') ||
      actionLower.includes('내보내기') || actionLower.includes('export')) {
    return <Badge variant="default">다운로드</Badge>;
  }

  // 업로드 계열 (생성과 분리)
  if (actionLower.includes('업로드') || actionLower.includes('upload') ||
      actionLower.includes('가져오기') || actionLower.includes('import')) {
    return <Badge variant="info">업로드</Badge>;
  }

  // 생성 계열
  if (actionLower.includes('생성') || actionLower.includes('create') ||
      actionLower.includes('추가') || actionLower.includes('등록') ||
      actionLower.includes('접수') || actionLower.includes('신규') ||
      actionLower.includes('발생') || actionLower.includes('add') ||
      actionLower.includes('new')) {
    return <Badge variant="success">생성</Badge>;
  }

  // 수정/변경 계열
  if (actionLower.includes('수정') || actionLower.includes('update') ||
      actionLower.includes('변경') || actionLower.includes('편집') ||
      actionLower.includes('갱신') || actionLower.includes('답변') ||
      actionLower.includes('reply') || actionLower.includes('response') ||
      actionLower.includes('edit') || actionLower.includes('modify')) {
    return <Badge variant="info">수정</Badge>;
  }

  // 발송/전송 계열
  if (actionLower.includes('발송') || actionLower.includes('send') ||
      actionLower.includes('전송') || actionLower.includes('발행') ||
      actionLower.includes('publish')) {
    return <Badge variant="default">발송</Badge>;
  }

  // 승인 계열 (완료와 분리)
  if (actionLower.includes('승인') || actionLower.includes('approve')) {
    return <Badge variant="success">승인</Badge>;
  }

  // 완료/처리 계열
  if (actionLower.includes('완료') || actionLower.includes('처리') ||
      actionLower.includes('complete') || actionLower.includes('finish') ||
      actionLower.includes('done')) {
    return <Badge variant="warning">완료</Badge>;
  }

  // 취소 계열 (삭제와 분리)
  if (actionLower.includes('취소') || actionLower.includes('cancel')) {
    return <Badge variant="outline">취소</Badge>;
  }

  // 로그인
  if (actionLower.includes('로그인') || actionLower.includes('login') ||
      actionLower.includes('sign in')) {
    return <Badge variant="outline">로그인</Badge>;
  }

  // 로그아웃
  if (actionLower.includes('로그아웃') || actionLower.includes('logout') ||
      actionLower.includes('sign out')) {
    return <Badge variant="outline">로그아웃</Badge>;
  }

  // 조회/검색 계열
  if (actionLower.includes('조회') || actionLower.includes('검색') ||
      actionLower.includes('read') || actionLower.includes('view') ||
      actionLower.includes('get') || actionLower.includes('분석')) {
    return <Badge variant="secondary">조회</Badge>;
  }

  return <Badge variant="secondary">{action}</Badge>;
};

type TabType = 'activities' | 'alerts';

export default function AuditPage() {
  return (
    <Suspense fallback={
      <div className="container max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    }>
      <AuditPageContent />
    </Suspense>
  );
}

function AuditPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get('tab') as TabType) || 'activities';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Activities state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Data fetching
  const { data: activitiesData, isLoading: activitiesLoading, isError: activitiesError, refetch: refetchActivities, isFetching: activitiesFetching } = useActivities(100);
  const { data: alertsData, isLoading: alertsLoading, isError: alertsError, refetch: refetchAlerts, isFetching: alertsFetching } = useAlerts(100);

  const activities = activitiesData?.activities || [];
  const alerts = alertsData?.alerts || [];

  // Sync tab with URL
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType;
    if (tabParam && (tabParam === 'activities' || tabParam === 'alerts')) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/audit?tab=${tab}`, { scroll: false });
    setPage(1);
    setSearchQuery('');
    setSelectedModules([]);
  };

  // Activities filtering
  const filteredActivities = activities.filter((log) => {
    const matchesSearch =
      searchQuery === '' ||
      log.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.module?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesModule =
      selectedModules.length === 0 || selectedModules.includes(log.module);

    return matchesSearch && matchesModule;
  });

  // Alerts filtering
  const filteredAlerts = alerts.filter((alert) => {
    if (searchQuery === '') return true;
    return (
      alert.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.source?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Pagination
  const currentData = activeTab === 'activities' ? filteredActivities : filteredAlerts;
  const totalPages = Math.ceil(currentData.length / pageSize);
  const paginatedData = currentData.slice((page - 1) * pageSize, page * pageSize);

  const handleModuleToggle = (module: string) => {
    setSelectedModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedModules([]);
    setPage(1);
  };

  const handleExport = () => {
    if (activeTab === 'activities') {
      const headers = ['시간', '사용자', '액션', '모듈', '대상'];
      const rows = filteredActivities.map((log) => [
        new Date(log.createdAt).toLocaleString('ko-KR'),
        log.userName,
        log.action,
        log.module,
        log.target,
      ]);
      const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
      downloadCSV(csv, 'activities');
    } else {
      const headers = ['시간', '제목', '메시지', '유형', '읽음'];
      const rows = filteredAlerts.map((alert) => [
        new Date(alert.createdAt).toLocaleString('ko-KR'),
        alert.title,
        alert.message,
        alert.severity,
        alert.read ? 'O' : 'X',
      ]);
      const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
      downloadCSV(csv, 'alerts');
    }
  };

  const downloadCSV = (csv: string, type: string) => {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    if (activeTab === 'activities') {
      refetchActivities();
    } else {
      refetchAlerts();
    }
  };

  const hasActiveFilters = searchQuery !== '' || selectedModules.length > 0;
  const isLoading = activeTab === 'activities' ? activitiesLoading : alertsLoading;
  const isError = activeTab === 'activities' ? activitiesError : alertsError;
  const isFetching = activeTab === 'activities' ? activitiesFetching : alertsFetching;

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">활동 & 알림</h1>
          <p className="text-muted-foreground">시스템 활동 기록 및 알림 관리</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={currentData.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            내보내기
          </Button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => handleTabChange('activities')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 border-b-2 transition-colors',
            activeTab === 'activities'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Activity className="h-4 w-4" />
          최근 활동
          <Badge variant="secondary" className="text-xs">
            {activities.length}
          </Badge>
        </button>
        <button
          onClick={() => handleTabChange('alerts')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 border-b-2 transition-colors',
            activeTab === 'alerts'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Bell className="h-4 w-4" />
          알림
          {alertsData?.unreadCount ? (
            <Badge variant="danger" className="text-xs">
              {alertsData.unreadCount}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              {alerts.length}
            </Badge>
          )}
        </button>
      </div>

      {/* 필터 */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={activeTab === 'activities' ? '사용자, 액션, 대상, 모듈 검색...' : '제목, 메시지, 출처 검색...'}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        {activeTab === 'activities' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                모듈 필터
                {selectedModules.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedModules.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>모듈 선택</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {MODULES.map((module) => (
                <DropdownMenuCheckboxItem
                  key={module}
                  checked={selectedModules.includes(module)}
                  onCheckedChange={() => handleModuleToggle(module)}
                >
                  {module}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            필터 초기화
          </Button>
        )}
      </div>

      {/* 활성 필터 표시 */}
      {selectedModules.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {selectedModules.map((module) => (
            <Badge
              key={module}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => handleModuleToggle(module)}
            >
              {module}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* 콘텐츠 */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">로딩 중...</p>
            </div>
          ) : isError ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">데이터를 불러올 수 없습니다</p>
              <Button variant="link" onClick={handleRefresh}>
                다시 시도
              </Button>
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">
                {hasActiveFilters
                  ? '검색 결과가 없습니다'
                  : activeTab === 'activities'
                  ? '아직 기록된 활동이 없습니다'
                  : '알림이 없습니다'}
              </p>
            </div>
          ) : activeTab === 'activities' ? (
            // 활동 테이블
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
                {(paginatedData as typeof activities).map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4 text-muted-foreground text-sm whitespace-nowrap">
                      <span title={new Date(log.createdAt).toLocaleString('ko-KR')}>
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </td>
                    <td className="p-4 font-medium">{log.userName}</td>
                    <td className="p-4">{getActionBadge(log.action)}</td>
                    <td className="p-4">
                      <Badge variant="outline">{log.module}</Badge>
                    </td>
                    <td className="p-4 text-muted-foreground max-w-xs truncate">
                      {log.target}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            // 알림 목록
            <div className="divide-y">
              {(paginatedData as Alert[]).map((alert) => {
                const styles = getAlertStyles(alert.severity);
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      'p-4 hover:bg-muted/30 transition-colors',
                      !alert.read && styles.bg
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', styles.dot)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={cn('font-medium', !alert.read && 'font-semibold')}>
                            {alert.title}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {alert.severity}
                          </Badge>
                          {alert.source && (
                            <Badge variant="secondary" className="text-xs">
                              {alert.source}
                            </Badge>
                          )}
                          {!alert.read && (
                            <Badge variant="danger" className="text-xs">
                              읽지 않음
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {alert.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatRelativeTime(alert.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 페이지네이션 */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {currentData.length}개 항목
          {hasActiveFilters && ` (전체 ${activeTab === 'activities' ? activities.length : alerts.length}개 중)`}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              이전
            </Button>
            <span>
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
