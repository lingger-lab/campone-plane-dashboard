'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { ModulePoster } from '@/components/modules/ModulePoster';

export default function InsightsPage() {
  return (
    <ModulePoster
      moduleId="M1"
      name="Insights"
      slogan="이슈는 보이고, 결정은 빨라진다."
      description="실시간 여론 동향을 모니터링하고, 지역별/감성별 분석을 통해 캠페인 전략을 수립하세요. 리스크를 사전에 감지하고 신속하게 대응할 수 있습니다."
      benefits={[
        '실시간 이슈 레이더로 트렌드를 먼저 파악',
        '지역/감성 히트맵으로 민심을 한눈에',
        '리스크 사전 경보로 위기를 선제 대응',
      ]}
      managePath="/pulse/manage"
      publicUrl="/public/insights"
      kpis={[
        { label: '합성 지수', value: 72, status: 'success' },
        { label: 'Google 트렌드', value: 70 },
        { label: 'Naver 관심도', value: 75 },
        { label: '급증 경보', value: 2, status: 'warning' },
      ]}
      gradient="from-blue-500/20 to-cyan-500/5"
      icon={<TrendingUp className="w-full h-full" />}
    />
  );
}
