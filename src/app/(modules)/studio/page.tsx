'use client';

import React from 'react';
import { Palette } from 'lucide-react';
import { ModulePoster } from '@/components/modules/ModulePoster';

export default function StudioPage() {
  return (
    <ModulePoster
      moduleId="M2"
      name="Studio"
      slogan="콘텐츠 제작·배포, 한 번에."
      description="카드뉴스, 공지사항, 보도자료 등 다양한 콘텐츠를 템플릿으로 손쉽게 제작하고, 캘린더와 연동하여 일정에 맞춰 자동 배포하세요."
      benefits={[
        '카드/공지 템플릿으로 빠른 콘텐츠 제작',
        '변수 치환과 버전 관리로 효율적 운영',
        '캘린더 연동으로 예약 퍼블리시',
      ]}
      managePath="/studio/manage"
      publicUrl="/public/studio"
      kpis={[
        { label: '퍼블리시', value: 24, status: 'success' },
        { label: '준비중', value: 8 },
        { label: '템플릿', value: 15 },
        { label: '에셋', value: 42 },
      ]}
      gradient="from-purple-500/20 to-pink-500/5"
      icon={<Palette className="w-full h-full" />}
    />
  );
}
