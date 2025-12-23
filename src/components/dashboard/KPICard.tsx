'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { KPIStatus } from '@/lib/types';

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  status: KPIStatus;
  sparkline?: number[];
  source?: string;
  className?: string;
}

export function KPICard({
  label,
  value,
  unit,
  change,
  changeLabel,
  status,
  sparkline,
  source,
  className,
}: KPICardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'danger':
        return 'text-danger';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTrendIcon = () => {
    if (change === undefined || change === 0) return <Minus className="h-4 w-4" />;
    return change > 0 ? (
      <TrendingUp className="h-4 w-4" />
    ) : (
      <TrendingDown className="h-4 w-4" />
    );
  };

  const formatChange = (val: number) => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}%`;
  };

  // 간단한 스파크라인 SVG
  const renderSparkline = () => {
    if (!sparkline || sparkline.length === 0) return null;

    const max = Math.max(...sparkline);
    const min = Math.min(...sparkline);
    const range = max - min || 1;
    const width = 80;
    const height = 24;
    const step = width / (sparkline.length - 1);

    const points = sparkline
      .map((val, i) => {
        const x = i * step;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg width={width} height={height} className="opacity-50">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          points={points}
          className={getStatusColor()}
        />
      </svg>
    );
  };

  return (
    <Card className={cn('card-hover-lift bg-white/90 dark:bg-card/90 backdrop-blur-sm', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tabular-nums">
                {typeof value === 'number' ? value.toLocaleString('ko-KR') : value}
              </span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
          </div>
          {sparkline && <div className="pt-1">{renderSparkline()}</div>}
        </div>

        {/* 변화율 & 소스 */}
        <div className="mt-3 flex items-center justify-between">
          {change !== undefined && (
            <div className={cn('flex items-center gap-1 text-sm', getStatusColor())}>
              {getTrendIcon()}
              <span className="font-medium">{formatChange(change)}</span>
              {changeLabel && (
                <span className="text-muted-foreground">{changeLabel}</span>
              )}
            </div>
          )}
          {source && (
            <span className="text-xs text-muted-foreground">{source}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
