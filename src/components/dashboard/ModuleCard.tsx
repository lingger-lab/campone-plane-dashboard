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
  const handleCardClick = () => {
    window.open('https://campone.cloud/', '_blank');
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 카드 클릭 이벤트 전파 방지
    window.open('https://campone.cloud/', '_blank');
  };

  return (
    <Card
      className={cn('module-card-hover overflow-hidden cursor-pointer bg-white/90 dark:bg-card/90 backdrop-blur-sm', className)}
      onClick={handleCardClick}
    >
      {/* 썸네일 영역 - 반응형 높이 */}
      {thumbnail ? (
        <div className="w-full h-[200px] sm:h-[250px] lg:h-[300px] xl:h-[350px] bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden relative group">
          <img
            src={thumbnail}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 will-change-transform"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.parentElement?.querySelector('.fallback-content') as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          <div
            className="fallback-content hidden absolute inset-0 items-center justify-center"
            style={{ display: 'none' }}
          >
            <span className="text-3xl sm:text-4xl font-bold text-primary/30">{name[0]}</span>
          </div>
        </div>
      ) : (
        <div className="w-full h-[200px] sm:h-[250px] lg:h-[300px] xl:h-[350px] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <span className="text-3xl sm:text-4xl font-bold text-primary/30">{name[0]}</span>
        </div>
      )}

      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="font-medium">{name}</span>
        </CardTitle>
        <p className="text-sm font-normal text-primary">{slogan}</p>
      </CardHeader>

      <CardContent className="flex flex-col space-y-2 min-h-[180px] pb-4">
        <div className="flex-1 space-y-2">
          {/* 베네핏 리스트 */}
          <ul className="space-y-0.5 text-sm text-muted-foreground">
            {benefits.map((benefit, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span className="font-normal">{benefit}</span>
              </li>
            ))}
          </ul>

          {/* KPI 미리보기 */}
          {kpis && kpis.length > 0 && (
            <div className="flex gap-4 border-t pt-1.5">
              {kpis.map((kpi, i) => (
                <div key={i} className="text-center">
                  <p className="text-lg font-medium">
                    {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                  </p>
                  <p className="text-xs text-muted-foreground font-normal">{kpi.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA 버튼 - 고정 높이 */}
        <div className="flex gap-2 border-t pt-1.5 mt-auto">
          <Button
            size="sm"
            className="flex-1 text-white font-normal h-9 btn-shine"
            onClick={handleButtonClick}
          >
            <Settings className="mr-1 h-4 w-4 text-white" />
            <span className="text-white font-normal">관리 열기</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            title="데이터 업데이트"
            className="h-9"
            onClick={(e) => e.stopPropagation()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {publicUrl && (
            <Button 
              variant="outline" 
              size="sm" 
              asChild 
              title="사이트 열어보기"
              className="h-9"
              onClick={(e) => e.stopPropagation()}
            >
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
