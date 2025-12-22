'use client';

import React from 'react';
import { FileCheck } from 'lucide-react';
import { ModulePoster } from '@/components/modules/ModulePoster';

export default function PolicyLabPage() {
  return (
    <ModulePoster
      moduleId="M3"
      name="Policy Lab"
      slogan="비전부터 근거까지, 구조화."
      description="캠페인의 비전과 공약을 체계적으로 관리하세요. 근거 자료와 사례를 연결하고, 영향 분석과 재원 계획을 한눈에 파악할 수 있습니다."
      benefits={[
        '비전과 10대 공약을 체계적으로 구조화',
        '근거/사례 링크로 신뢰도 강화',
        '영향·재원 메모로 실현 가능성 검증',
      ]}
      managePath="/policy/manage"
      publicUrl="/public/policy"
      kpis={[
        { label: '공약 완성도', value: '78%', status: 'success' },
        { label: '검토 대기', value: 3, status: 'warning' },
        { label: '근거 자료', value: 42 },
        { label: '시민 질문', value: 15 },
      ]}
      gradient="from-emerald-500/20 to-teal-500/5"
      icon={<FileCheck className="w-full h-full" />}
    />
  );
}
