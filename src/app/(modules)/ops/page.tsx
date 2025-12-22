'use client';

import React from 'react';
import { ListChecks } from 'lucide-react';
import { ModulePoster } from '@/components/modules/ModulePoster';

export default function OpsPage() {
  return (
    <ModulePoster
      moduleId="M4"
      name="Ops"
      slogan="캠프 운영, 체크리스트 한 장."
      description="캠프 운영에 필요한 모든 업무를 체크리스트로 관리하세요. 알림과 런북으로 자동화하고, 역할별 권한을 체계적으로 관리할 수 있습니다."
      benefits={[
        '기간별 체크리스트로 업무 누락 방지',
        '알림/런북 자동화로 효율적 운영',
        '역할/권한 연동으로 체계적 관리',
      ]}
      managePath="/ops/manage"
      kpis={[
        { label: '완료율', value: '67%', status: 'warning' },
        { label: '미처리', value: 5, status: 'warning' },
        { label: 'SLA 준수', value: '92%', status: 'success' },
        { label: '승인 대기', value: 2 },
      ]}
      gradient="from-orange-500/20 to-amber-500/5"
      icon={<ListChecks className="w-full h-full" />}
    />
  );
}
