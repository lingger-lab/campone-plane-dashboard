'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { KPIStatus } from '@/lib/types';

// 서비스별 컬러 테마
const SERVICE_COLORS: Record<string, { border: string; bg: string; gauge: string }> = {
  insight: { border: 'border-l-blue-500', bg: 'from-blue-500/5', gauge: '#2563EB' },
  hub: { border: 'border-l-emerald-500', bg: 'from-emerald-500/5', gauge: '#10B981' },
  policy: { border: 'border-l-violet-500', bg: 'from-violet-500/5', gauge: '#8B5CF6' },
  ops: { border: 'border-l-amber-500', bg: 'from-amber-500/5', gauge: '#F59E0B' },
  studio: { border: 'border-l-rose-500', bg: 'from-rose-500/5', gauge: '#F43F5E' },
};

const DEFAULT_COLORS = { border: 'border-l-gray-300', bg: 'from-gray-500/5', gauge: '#6B7280' };

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  status: KPIStatus;
  sparkline?: number[];
  source?: string;
  service?: string;
  className?: string;
}

/** 반원형 미니 게이지 (% 단위용) */
function MiniGauge({ value, color }: { value: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 28;
  const circumference = Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg width="64" height="38" viewBox="0 0 64 38" className="shrink-0">
      <path
        d="M 4 34 A 28 28 0 0 1 60 34"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        className="text-muted/30"
        strokeLinecap="round"
      />
      <path
        d="M 4 34 A 28 28 0 0 1 60 34"
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
      <text
        x="32"
        y="33"
        textAnchor="middle"
        className="fill-foreground"
        fontSize="13"
        fontWeight="700"
      >
        {clamped}
      </text>
    </svg>
  );
}

/** 수평 바 인디케이터 (점 단위용) */
function MiniBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden mt-1">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
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
  service,
  className,
}: KPICardProps) {
  const colors = SERVICE_COLORS[service || ''] || DEFAULT_COLORS;
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
  const isPercentage = unit === '%';
  const isScore = unit === '점';
  const hasNumericValue = !isNaN(numericValue);
  const isWaiting = value === '-';

  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'text-success';
      case 'warning': return 'text-warning';
      case 'danger': return 'text-danger';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendIcon = () => {
    if (change === undefined || change === 0) return <Minus className="h-3.5 w-3.5" />;
    return change > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />;
  };

  const formatChange = (val: number) => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}%`;
  };

  const renderSparkline = () => {
    if (!sparkline || sparkline.length === 0) return null;
    const max = Math.max(...sparkline);
    const min = Math.min(...sparkline);
    const range = max - min || 1;
    const width = 80;
    const height = 24;
    const step = width / (sparkline.length - 1);
    const points = sparkline
      .map((val, i) => `${i * step},${height - ((val - min) / range) * height}`)
      .join(' ');
    return (
      <svg width={width} height={height} className="opacity-50">
        <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={points} className={getStatusColor()} />
      </svg>
    );
  };

  return (
    <Card
      className={cn(
        'card-hover-lift bg-white/90 dark:bg-card/90 backdrop-blur-sm overflow-hidden border-l-[3px]',
        colors.border,
        className
      )}
    >
      <CardContent className={cn('p-4 min-w-0 bg-gradient-to-br to-transparent', colors.bg)}>
        {/* 상단: 라벨 + 소스 */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
          {source && (
            <span className="text-[10px] text-muted-foreground/60 shrink-0">{source}</span>
          )}
        </div>

        {/* 중앙: 값 표시 */}
        {isWaiting ? (
          <div className="flex items-center justify-center py-3">
            <span className="text-lg text-muted-foreground/40 font-medium">연동 대기</span>
          </div>
        ) : isPercentage && hasNumericValue ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-1 min-w-0">
              <span className="text-3xl font-bold tabular-nums" style={{ color: colors.gauge }}>
                {numericValue.toLocaleString('ko-KR')}
              </span>
              <span className="text-sm text-muted-foreground shrink-0">{unit}</span>
            </div>
            <MiniGauge value={numericValue} color={colors.gauge} />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tabular-nums truncate">
                  {hasNumericValue ? numericValue.toLocaleString('ko-KR') : value}
                </span>
                {unit && <span className="text-sm text-muted-foreground shrink-0">{unit}</span>}
              </div>
              {isScore && hasNumericValue && (
                <MiniBar value={numericValue} color={colors.gauge} />
              )}
            </div>
            {/* 건/개/명 단위: 트렌드 배지 */}
            {hasNumericValue && !isScore && change !== undefined && change !== 0 && (
              <div
                className={cn(
                  'flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-semibold shrink-0',
                  change > 0
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                )}
              >
                {change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </div>
            )}
          </div>
        )}

        {sparkline && <div className="mt-1 shrink-0">{renderSparkline()}</div>}

        {/* 하단: 변화율 */}
        {change !== undefined && !isWaiting && (
          <div className={cn('mt-2 flex items-center gap-1 text-xs min-w-0', getStatusColor())}>
            <span className="shrink-0">{getTrendIcon()}</span>
            <span className="font-semibold shrink-0">{formatChange(change)}</span>
            {changeLabel && (
              <span className="text-muted-foreground truncate">{changeLabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
