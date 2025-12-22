'use client';

import React from 'react';
import Link from 'next/link';
import { Settings, RefreshCw, ExternalLink, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ModulePosterProps {
  moduleId: string;
  name: string;
  slogan: string;
  description: string;
  benefits: string[];
  managePath: string;
  publicUrl?: string;
  kpis?: { label: string; value: string | number; status?: 'success' | 'warning' | 'danger' }[];
  gradient?: string;
  icon: React.ReactNode;
}

export function ModulePoster({
  moduleId,
  name,
  slogan,
  description,
  benefits,
  managePath,
  publicUrl,
  kpis,
  gradient = 'from-primary/20 to-primary/5',
  icon,
}: ModulePosterProps) {
  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-8">
      {/* 히어로 섹션 */}
      <section
        className={cn(
          'relative rounded-3xl p-8 md:p-12 overflow-hidden',
          `bg-gradient-to-br ${gradient}`
        )}
      >
        <div className="relative z-10 max-w-2xl">
          <Badge variant="outline" className="mb-4">
            {moduleId}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{name}</h1>
          <p className="text-xl md:text-2xl font-medium text-primary mb-4">{slogan}</p>
          <p className="text-muted-foreground mb-8">{description}</p>

          {/* CTA 버튼 */}
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={managePath}>
                <Settings className="mr-2 h-5 w-5" />
                관리 열기
              </Link>
            </Button>
            <Button variant="outline" size="lg">
              <RefreshCw className="mr-2 h-5 w-5" />
              데이터 업데이트
            </Button>
            {publicUrl && (
              <Button variant="outline" size="lg" asChild>
                <Link href={publicUrl} target="_blank">
                  <ExternalLink className="mr-2 h-5 w-5" />
                  사이트 열어보기
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* 배경 아이콘 */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10 text-primary">
          <div className="w-48 h-48 md:w-64 md:h-64">{icon}</div>
        </div>
      </section>

      {/* 베네핏 섹션 */}
      <section className="grid md:grid-cols-3 gap-6">
        {benefits.map((benefit, i) => (
          <div
            key={i}
            className="rounded-2xl border bg-card p-6 hover:shadow-medium transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                {i + 1}
              </div>
              <h3 className="font-semibold">{benefit.split(' ')[0]}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{benefit}</p>
          </div>
        ))}
      </section>

      {/* KPI 섹션 */}
      {kpis && kpis.length > 0 && (
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">현재 지표</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {kpis.map((kpi, i) => (
              <div key={i} className="text-center">
                <p
                  className={cn(
                    'text-3xl font-bold',
                    kpi.status === 'success' && 'text-success',
                    kpi.status === 'warning' && 'text-warning',
                    kpi.status === 'danger' && 'text-danger'
                  )}
                >
                  {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                </p>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 빠른 시작 */}
      <section className="rounded-2xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">빠른 시작</h2>
            <p className="text-sm text-muted-foreground">
              관리 화면에서 데이터를 확인하고 관리하세요
            </p>
          </div>
          <Button asChild>
            <Link href={managePath}>
              시작하기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
