'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink, Settings, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ModuleCardProps {
  name: string;
  path: string;
  slogan: string;
  benefits: string[];
  thumbnail?: string;
  kpis?: { label: string; value: string | number }[];
  publicUrl?: string;
  className?: string;
}

export function ModuleCard({
  name,
  path,
  slogan,
  benefits,
  thumbnail,
  kpis,
  publicUrl,
  className,
}: ModuleCardProps) {
  return (
    <Card className={cn('card-hover overflow-hidden', className)}>
      {/* 썸네일 영역 */}
      {thumbnail ? (
        <div className="aspect-video w-full bg-secondary">
          <img
            src={thumbnail}
            alt={name}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <span className="text-4xl font-bold text-primary/30">{name[0]}</span>
        </div>
      )}

      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>{name}</span>
        </CardTitle>
        <p className="text-sm font-medium text-primary">{slogan}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 베네핏 리스트 */}
        <ul className="space-y-1 text-sm text-muted-foreground">
          {benefits.map((benefit, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        {/* KPI 미리보기 */}
        {kpis && kpis.length > 0 && (
          <div className="flex gap-4 border-t pt-3">
            {kpis.map((kpi, i) => (
              <div key={i} className="text-center">
                <p className="text-lg font-semibold">
                  {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                </p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* CTA 버튼 */}
        <div className="flex gap-2 border-t pt-3">
          <Button asChild size="sm" className="flex-1">
            <Link href={`${path}/manage`}>
              <Settings className="mr-1 h-4 w-4" />
              관리 열기
            </Link>
          </Button>
          <Button variant="outline" size="sm" title="데이터 업데이트">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {publicUrl && (
            <Button variant="outline" size="sm" asChild title="사이트 열어보기">
              <Link href={publicUrl} target="_blank">
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
