'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Save, RotateCcw, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/lib/tenant/TenantContext';
import { useTenantPreference, useSaveTenantPreference } from '@/hooks/useTenantPreference';
import { KPI_CATALOG, DEFAULT_SELECTED_KPIS, SERVICE_LABELS, SERVICE_TO_FEATURE } from '@/lib/kpi-catalog';
import { canEdit as canEditRole } from '@/lib/rbac';

export default function DashboardKpiPage() {
  const { data: session } = useSession();
  const { tenantId, config } = useTenant();
  const { data: savedKpis, isLoading } = useTenantPreference<string[]>('selected_kpis');
  const saveMutation = useSaveTenantPreference();

  const userRole = (session?.user as { role?: string })?.role || 'viewer';
  const canEdit = canEditRole(userRole);

  // 선택된 KPI 목록 (순서 유지)
  const [selectedKpis, setSelectedKpis] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // DB에서 로드된 값으로 초기화
  useEffect(() => {
    if (!isLoading && !initialized) {
      setSelectedKpis(savedKpis || DEFAULT_SELECTED_KPIS);
      setInitialized(true);
    }
  }, [savedKpis, isLoading, initialized]);

  // 허용된 서비스 기반으로 사용 가능한 KPI 필터링
  const availableKpis = useMemo(() => {
    return KPI_CATALOG.filter((kpi) => {
      const featureKey = SERVICE_TO_FEATURE[kpi.service];
      if (!featureKey) return false;
      return config.features?.[featureKey as keyof typeof config.features] !== false;
    });
  }, [config.features]);

  // 서비스별 그룹
  const groupedKpis = useMemo(() => {
    const groups: Record<string, typeof availableKpis> = {};
    for (const kpi of availableKpis) {
      if (!groups[kpi.service]) {
        groups[kpi.service] = [];
      }
      groups[kpi.service].push(kpi);
    }
    return groups;
  }, [availableKpis]);

  // 변경 여부
  const hasChanges = useMemo(() => {
    const original = savedKpis || DEFAULT_SELECTED_KPIS;
    if (selectedKpis.length !== original.length) return true;
    return selectedKpis.some((k, i) => k !== original[i]);
  }, [selectedKpis, savedKpis]);

  // KPI 토글
  const toggleKpi = useCallback((dbKey: string) => {
    setSelectedKpis((prev) => {
      if (prev.includes(dbKey)) {
        return prev.filter((k) => k !== dbKey);
      }
      return [...prev, dbKey];
    });
  }, []);

  // 순서 이동
  const moveKpi = useCallback((dbKey: string, direction: 'up' | 'down') => {
    setSelectedKpis((prev) => {
      const idx = prev.indexOf(dbKey);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }, []);

  // 저장
  const handleSave = () => {
    saveMutation.mutate({ key: 'selected_kpis', value: selectedKpis });
  };

  // 초기화
  const handleReset = () => {
    setSelectedKpis(savedKpis || DEFAULT_SELECTED_KPIS);
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="text-center py-12 text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link href={`/${tenantId}/settings`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            설정
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">대시보드 KPI 설정</h1>
          <p className="text-muted-foreground text-sm">
            메인 대시보드에 표시할 핵심 지표를 선택하세요
          </p>
        </div>
        {canEdit && hasChanges && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              초기화
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-1" />
              {saveMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
        )}
      </div>

      {saveMutation.isSuccess && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-300">
          저장되었습니다.
        </div>
      )}

      {/* 현재 선택된 KPI (순서 조정 가능) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">선택된 KPI ({selectedKpis.length}개)</CardTitle>
          <CardDescription>
            대시보드에 표시되는 순서입니다. 화살표로 순서를 변경할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedKpis.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              아래에서 표시할 KPI를 선택하세요
            </p>
          ) : (
            <div className="space-y-2">
              {selectedKpis.map((dbKey, idx) => {
                const kpi = KPI_CATALOG.find((k) => k.dbKey === dbKey);
                if (!kpi) return null;
                const isAvailable = availableKpis.some((k) => k.dbKey === dbKey);
                return (
                  <div
                    key={dbKey}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-background"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium flex-1">
                      {kpi.label}
                      {kpi.unit && (
                        <span className="text-muted-foreground ml-1">({kpi.unit})</span>
                      )}
                    </span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {kpi.source}
                    </Badge>
                    {!isAvailable && (
                      <Badge variant="destructive" className="text-xs shrink-0">
                        서비스 비활성
                      </Badge>
                    )}
                    {canEdit && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          disabled={idx === 0}
                          onClick={() => moveKpi(dbKey, 'up')}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          disabled={idx === selectedKpis.length - 1}
                          onClick={() => moveKpi(dbKey, 'down')}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 서비스별 KPI 카탈로그 */}
      {Object.entries(groupedKpis).map(([service, kpis]) => (
        <Card key={service}>
          <CardHeader>
            <CardTitle className="text-base">
              {SERVICE_LABELS[service] || service}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {kpis.map((kpi) => {
                const isSelected = selectedKpis.includes(kpi.dbKey);
                return (
                  <button
                    key={kpi.dbKey}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => toggleKpi(kpi.dbKey)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-border hover:border-muted-foreground/30'
                    } ${!canEdit ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                  >
                    <div
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : 'border-muted-foreground/30'
                      }`}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{kpi.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {kpi.source} {kpi.unit && `· ${kpi.unit}`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {Object.keys(groupedKpis).length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            활성화된 서비스가 없습니다. 서비스를 활성화한 후 KPI를 선택할 수 있습니다.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
