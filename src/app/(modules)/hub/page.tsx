'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { ModulePoster } from '@/components/modules/ModulePoster';

export default function CivicHubPage() {
  return (
    <ModulePoster
      moduleId="M5"
      name="Civic Hub"
      slogan="질문엔 답하고, 메시지는 도달한다."
      description="시민과의 소통을 체계적으로 관리하세요. 세그먼트 기반 메시징, A/B 테스트, 예약 발송으로 효과적인 캠페인을 운영하고, 인바운드 문의에 신속하게 대응하세요."
      benefits={[
        '세그먼트 메시징으로 타겟 맞춤 소통',
        'A/B 테스트와 오픈/응답 추적으로 성과 측정',
        '인바운드 Q&A/민원함으로 양방향 소통',
      ]}
      managePath="/hub/manage"
      publicUrl="/public/hub"
      kpis={[
        { label: '발송', value: '2.6K', status: 'success' },
        { label: '오픈율', value: '45%', status: 'success' },
        { label: '응답률', value: '12%' },
        { label: '미처리', value: 8, status: 'warning' },
      ]}
      gradient="from-indigo-500/20 to-violet-500/5"
      icon={<Users className="w-full h-full" />}
    />
  );
}
