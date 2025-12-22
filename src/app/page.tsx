'use client';

import React, { useState } from 'react';
import { AppHeader, Sidebar, AppFooter } from '@/components/layout';
import { KPICard, ModuleCard } from '@/components/dashboard';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// 모듈 데이터
const modules = [
  {
    name: 'Insights',
    path: '/pulse',
    slogan: '이슈는 보이고, 결정은 빨라진다.',
    benefits: ['실시간 이슈 레이더', '지역/감성 한눈에', '리스크 사전 경보'],
    kpis: [
      { label: '합성 지수', value: 72 },
      { label: '급증 경보', value: 2 },
    ],
    publicUrl: '/public/insights',
  },
  {
    name: 'Studio',
    path: '/studio',
    slogan: '콘텐츠 제작·배포, 한 번에.',
    benefits: ['카드/공지 템플릿', '변수치환/버전관리', '캘린더 연동 퍼블리시'],
    kpis: [
      { label: '퍼블리시', value: 24 },
      { label: '준비율', value: '85%' },
    ],
    publicUrl: '/public/studio',
  },
  {
    name: 'Policy Lab',
    path: '/policy',
    slogan: '비전부터 근거까지, 구조화.',
    benefits: ['비전/10대 공약', '근거/사례 링크', '영향·재원 메모'],
    kpis: [
      { label: '완성도', value: '78%' },
      { label: '검토 대기', value: 3 },
    ],
    publicUrl: '/public/policy',
  },
  {
    name: 'Ops',
    path: '/ops',
    slogan: '캠프 운영, 체크리스트 한 장.',
    benefits: ['기간별 체크', '알림/런북 자동화', '역할/권한 연동'],
    kpis: [
      { label: '완료율', value: '67%' },
      { label: '미처리', value: 5 },
    ],
  },
  {
    name: 'Civic Hub',
    path: '/hub',
    slogan: '질문엔 답하고, 메시지는 도달한다.',
    benefits: ['세그먼트 메시징(A/B·예약)', '오픈/응답 추적', '인바운드 Q&A/민원함'],
    kpis: [
      { label: '발송', value: '2.6K' },
      { label: '오픈율', value: '45%' },
    ],
    publicUrl: '/public/hub',
  },
];

// KPI 데이터
const kpiData = [
  {
    label: '활성 연락처',
    value: 1350,
    unit: '명',
    change: 5.2,
    changeLabel: '전주 대비',
    status: 'success' as const,
    sparkline: [1200, 1220, 1250, 1280, 1300, 1320, 1350],
  },
  {
    label: '메시지 발송',
    value: 2680,
    unit: '건',
    change: 12.3,
    changeLabel: '오픈율 45%',
    status: 'success' as const,
    sparkline: [2100, 2200, 2350, 2400, 2500, 2600, 2680],
  },
  {
    label: '콘텐츠 퍼블리시',
    value: 24,
    unit: '건',
    change: -8.5,
    changeLabel: '주간',
    status: 'warning' as const,
    sparkline: [30, 28, 26, 25, 24, 24, 24],
  },
  {
    label: '이벤트/참석',
    value: 5,
    unit: '건',
    change: 0,
    changeLabel: '목표 8,000명',
    status: 'success' as const,
  },
  {
    label: '모금 합계',
    value: 760000,
    unit: '원',
    change: 15.8,
    changeLabel: '목표 90%',
    status: 'success' as const,
    sparkline: [500000, 550000, 600000, 650000, 700000, 730000, 760000],
  },
  {
    label: '완료 태스크',
    value: '2/10',
    change: -30,
    changeLabel: '계획 대비',
    status: 'warning' as const,
  },
  {
    label: '여론 트렌드',
    value: 72,
    unit: 'pt',
    change: 8.5,
    changeLabel: '전주 대비',
    status: 'success' as const,
    source: 'GT/NT/SNS',
    sparkline: [55, 58, 60, 63, 66, 69, 72],
  },
];

export default function DashboardPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />

      <main
        className={cn(
          'transition-all duration-300 pt-16 pb-12',
          sidebarCollapsed ? 'ml-16' : 'ml-60'
        )}
      >
        <div className="container max-w-7xl mx-auto p-6 space-y-8">
          {/* 브랜딩 헤더 */}
          <section className="rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xl">
                    홍
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">홍길동 캠페인</h1>
                    <p className="text-muted-foreground">변화를 만드는 힘</p>
                  </div>
                </div>
              </div>
              <Badge variant="success" className="px-3 py-1 text-sm">
                Active
              </Badge>
            </div>

            {/* 슬로건 슬라이더 */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {['국민과 함께하는 정치', '청년에게 희망을', '경제 성장의 새 길'].map(
                (slogan, i) => (
                  <div
                    key={i}
                    className={cn(
                      'shrink-0 rounded-lg px-4 py-2 text-sm',
                      i === 0
                        ? 'bg-primary text-white'
                        : 'bg-white/50 dark:bg-white/10'
                    )}
                  >
                    {slogan}
                  </div>
                )
              )}
            </div>
          </section>

          {/* KPI 그리드 */}
          <section>
            <h2 className="mb-4 text-lg font-semibold">핵심 지표</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {kpiData.map((kpi, i) => (
                <KPICard
                  key={i}
                  label={kpi.label}
                  value={kpi.value}
                  unit={kpi.unit}
                  change={kpi.change}
                  changeLabel={kpi.changeLabel}
                  status={kpi.status}
                  sparkline={kpi.sparkline}
                  source={kpi.source}
                />
              ))}
            </div>
          </section>

          {/* 모듈 카드 그리드 */}
          <section>
            <h2 className="mb-4 text-lg font-semibold">모듈 바로가기</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {modules.map((module) => (
                <ModuleCard
                  key={module.path}
                  name={module.name}
                  path={module.path}
                  slogan={module.slogan}
                  benefits={module.benefits}
                  kpis={module.kpis}
                  publicUrl={module.publicUrl}
                />
              ))}
            </div>
          </section>

          {/* 최근 활동 & 알림 */}
          <section className="grid gap-6 lg:grid-cols-2">
            {/* 최근 활동 타임라인 */}
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="mb-4 font-semibold">최근 활동</h3>
              <div className="space-y-4">
                {[
                  { action: '세그먼트 생성', user: '김관리', time: '2분 전', module: 'Hub' },
                  { action: '연설문 수정', user: '박매니저', time: '15분 전', module: 'Studio' },
                  { action: '메시지 발송', user: '김관리', time: '1시간 전', module: 'Hub' },
                  { action: 'SNS 카드 생성', user: '이스태프', time: '2시간 전', module: 'Studio' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="font-medium">{item.action}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.module}
                    </Badge>
                    <span className="text-muted-foreground">{item.user}</span>
                    <span className="ml-auto text-muted-foreground">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 알림 센터 */}
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="mb-4 font-semibold">알림</h3>
              <div className="space-y-3">
                {[
                  { type: 'warning', title: '여론 급증 감지', desc: 'SNS 멘션 25% 증가', pinned: true },
                  { type: 'warning', title: '메시지 승인 대기', desc: '타운홀 초대 메시지', pinned: true },
                  { type: 'info', title: '시스템 점검 예정', desc: '1월 15일 오전 2시~4시' },
                  { type: 'success', title: '캠페인 발송 완료', desc: '공약 안내 (1,480명)' },
                ].map((alert, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-start gap-3 rounded-lg p-3',
                      alert.type === 'warning' && 'bg-yellow-50 dark:bg-yellow-900/20',
                      alert.type === 'info' && 'bg-blue-50 dark:bg-blue-900/20',
                      alert.type === 'success' && 'bg-green-50 dark:bg-green-900/20'
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 h-2 w-2 rounded-full',
                        alert.type === 'warning' && 'bg-warning',
                        alert.type === 'info' && 'bg-primary',
                        alert.type === 'success' && 'bg-success'
                      )}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.desc}</p>
                    </div>
                    {alert.pinned && (
                      <Badge variant="outline" className="text-xs">
                        고정
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <AppFooter sidebarCollapsed={sidebarCollapsed} />
    </div>
  );
}
