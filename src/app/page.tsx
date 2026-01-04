'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Video,
  PlayCircle,
  MapPin,
  Users,
  MessageCircle,
  FileText,
  BookOpen,
  FileCheck,
  CheckCircle2,
  Newspaper,
  Briefcase,
  GraduationCap,
  List,
} from 'lucide-react';
import { AppHeader, Sidebar, AppFooter } from '@/components/layout';
import { KPICard, ModuleCard } from '@/components/dashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// 애니메이션 variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};


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
    thumbnail: '/module-i.png', // Insights 모듈 이미지
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
    thumbnail: '/module-s.png', // Studio 모듈 이미지
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
    thumbnail: '/module-p.png', // Policy Lab 모듈 이미지
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
    thumbnail: '/module-o.png', // Ops 모듈 이미지
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
    thumbnail: '/module-c.png', // Civic Hub 모듈 이미지
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
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [visionModalOpen, setVisionModalOpen] = useState(false);
  const [policyDetailModalOpen, setPolicyDetailModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-dynamic">
      <AppHeader onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />

      <main
        className={cn(
          'transition-all duration-300 pt-16',
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
        )}
      >
        <motion.div
          className="container max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* 브랜딩 헤더 */}
          <motion.section
            className="rounded-2xl bg-white/90 dark:bg-card/90 backdrop-blur-md p-4 sm:p-6 shadow-sm border"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              delay: 0.1, 
              duration: 0.8,
              type: "spring",
              stiffness: 100,
              damping: 15
            }}
            whileHover={{ scale: 1.01 }}
          >
            {/* 모바일: 세로 레이아웃 / 데스크탑: 가로 레이아웃 */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {/* 후보 이미지 */}
              <motion.div
                className="relative shrink-0"
                initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  rotate: 0,
                }}
                transition={{ 
                  delay: 0.3, 
                  duration: 0.6,
                  type: "spring",
                  stiffness: 150,
                  damping: 12
                }}
                whileHover={{ 
                  scale: 1.05, 
                  rotate: 2,
                  transition: { duration: 0.3 }
                }}
              >
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 4px 16px rgba(0, 0, 0, 0.1)",
                      "0 8px 24px rgba(59, 130, 246, 0.3)",
                      "0 4px 16px rgba(0, 0, 0, 0.1)",
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="rounded-xl"
                >
                  <Image
                    src="/candidate.png"
                    alt="홍길동 후보"
                    width={120}
                    height={120}
                    className="w-20 h-20 sm:w-[120px] sm:h-[120px] rounded-xl object-cover shadow-md"
                    priority
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                </motion.div>
                <div
                  className="hidden w-20 h-20 sm:w-[120px] sm:h-[120px] items-center justify-center rounded-xl bg-primary text-white font-bold text-xl sm:text-2xl shadow-md"
                  style={{ display: 'none' }}
                >
                  홍
                </div>
              </motion.div>

              {/* 캠페인 정보 */}
              <div className="flex-1 w-full">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 text-center sm:text-center lg:text-center">
                    <motion.div
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ 
                        delay: 0.5, 
                        duration: 0.8,
                        type: "spring",
                        stiffness: 120,
                        damping: 10
                      }}
                    >
                      <motion.h1 
                        className="text-xl sm:text-2xl font-bold text-primary"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                          delay: 0.6,
                          duration: 0.6,
                          type: "spring",
                          stiffness: 200
                        }}
                      >
                        홍길동 후보 선거대책본부
                      </motion.h1>
                      <motion.p 
                        className="text-sm sm:text-base text-muted-foreground font-medium mt-0.5"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                          delay: 0.7,
                          duration: 0.6
                        }}
                      >
                        창녕군 국회의원 후보
                      </motion.p>
                    </motion.div>

                    {/* 경력 정보 - 모바일: 가로 스크롤, 데스크탑: 세로 */}
                    <motion.div 
                      className="flex sm:flex-col gap-3 sm:gap-1 mt-2 overflow-x-auto pb-1 sm:pb-0 justify-center sm:justify-center lg:justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8, duration: 0.6 }}
                    >
                      {[
                        { icon: Briefcase, text: '행정경력 15년' },
                        { icon: GraduationCap, text: '부산대 교수' },
                        { icon: Users, text: '창녕군 당협위원장' },
                      ].map((item, index) => (
                        <motion.div
                          key={index}
                          className="flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap"
                          initial={{ opacity: 0, x: -20, scale: 0.8 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          transition={{
                            delay: 0.9 + index * 0.15,
                            duration: 0.5,
                            type: "spring",
                            stiffness: 150
                          }}
                          whileHover={{ 
                            scale: 1.1,
                            x: 5,
                            transition: { duration: 0.2 }
                          }}
                        >
                          <item.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                          <span>{item.text}</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0, rotate: -180 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{
                      delay: 1.2,
                      duration: 0.6,
                      type: "spring",
                      stiffness: 200
                    }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <motion.div
                      animate={{
                        boxShadow: [
                          "0 0 0 0 rgba(34, 197, 94, 0.4)",
                          "0 0 0 8px rgba(34, 197, 94, 0)",
                          "0 0 0 0 rgba(34, 197, 94, 0)",
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="rounded-full"
                    >
                      <Badge variant="success" className="px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm shrink-0">
                        Active
                      </Badge>
                    </motion.div>
                  </motion.div>
                </div>

                {/* 슬로건 - 데스크탑만 표시 */}
                <motion.div 
                  className="hidden sm:flex items-center gap-2 flex-wrap pt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.3, duration: 0.6 }}
                >
                  {['국민과 함께하는 정치', '청년에게 희망을', '경제 성장의 새 길'].map(
                    (slogan, i) => (
                      <motion.div
                        key={i}
                        className={cn(
                          'shrink-0 rounded-lg px-3 py-1.5 text-sm h-8 flex items-center cursor-pointer',
                          i === 0
                            ? 'bg-primary text-white'
                            : 'bg-white/50 dark:bg-white/10'
                        )}
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          delay: 1.4 + i * 0.1,
                          duration: 0.5,
                          type: "spring",
                          stiffness: 150
                        }}
                        whileHover={{ 
                          scale: 1.1, 
                          y: -2,
                          transition: { duration: 0.2 }
                        }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {slogan}
                      </motion.div>
                    )
                  )}
                </motion.div>
              </div>
            </div>

            {/* 모바일 CTA 영역 */}
            <motion.div 
              className="mt-4 space-y-3 sm:hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.6 }}
            >
              {/* 메인 CTA - 10대 공약 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ 
                  delay: 1.6, 
                  duration: 0.5,
                  type: "spring",
                  stiffness: 150
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  className="w-full py-4 h-auto bg-primary hover:bg-primary/90 text-white text-base font-bold rounded-xl"
                  onClick={() => window.open('https://campone.cloud/vision', '_blank')}
                >
                  <List className="h-5 w-5 mr-2" />
                  10대 공약 보기
                </Button>
              </motion.div>

              {/* 2x2 그리드 - 영상 콘텐츠 */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '출마선언', icon: PlayCircle, onClick: () => setVideoModalOpen(true) },
                  { label: '공약하이라이트', icon: Video, onClick: () => setAudioModalOpen(true) },
                  { label: '현장투어', icon: MapPin },
                  { label: '주민인터뷰', icon: Users },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ 
                      delay: 1.7 + index * 0.1, 
                      duration: 0.5,
                      type: "spring",
                      stiffness: 150
                    }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      className={cn(
                        "py-3 h-auto rounded-lg font-medium w-full",
                        index < 2
                          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                      variant="ghost"
                      onClick={item.onClick}
                    >
                      <item.icon className="h-4 w-4 mr-1.5" />
                      {item.label}
                    </Button>
                  </motion.div>
                ))}
              </div>

              {/* 텍스트 링크 - 블로그 콘텐츠 */}
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground pt-1">
                <a href="#" className="hover:text-primary transition-colors">정책팩트체크</a>
                <span className="text-border">·</span>
                <a href="#" className="hover:text-primary transition-colors">캠페뉴스</a>
                <span className="text-border">·</span>
                <a href="#" className="hover:text-primary transition-colors">비전스토리</a>
                <span className="text-border">·</span>
                <a href="#" className="hover:text-primary transition-colors">현장리포트</a>
              </div>
            </motion.div>

            {/* 데스크탑 CTA 영역 */}
            <motion.div 
              className="hidden sm:block mt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.6 }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                {/* 10대 공약 버튼 */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ 
                    delay: 1.6, 
                    duration: 0.5,
                    type: "spring",
                    stiffness: 150
                  }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    className="bg-primary hover:bg-primary/90 text-white font-medium gap-2 h-9 px-4 rounded-lg"
                    onClick={() => window.open('https://campone.cloud/vision', '_blank')}
                  >
                    <List className="h-4 w-4" />
                    10대 공약
                  </Button>
                </motion.div>

                {/* 출마선언 버튼 */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ 
                    delay: 1.7, 
                    duration: 0.5,
                    type: "spring",
                    stiffness: 150
                  }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white font-normal gap-2"
                    size="sm"
                    onClick={() => setVideoModalOpen(true)}
                  >
                    <PlayCircle className="h-4 w-4" />
                    출마선언
                  </Button>
                </motion.div>

                {/* 영상 콘텐츠 버튼 */}
                {[
                  { label: '공약하이라이트', icon: Video, onClick: () => setAudioModalOpen(true) },
                  { label: '현장투어', icon: MapPin },
                  { label: '주민인터뷰', icon: Users },
                  { label: '이슈에답하다', icon: MessageCircle, onClick: () => setIssueModalOpen(true) },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      delay: 1.8 + index * 0.1,
                      duration: 0.5,
                      type: "spring",
                      stiffness: 150
                    }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      className="bg-red-600 hover:bg-red-700 text-white font-normal gap-2"
                      size="sm"
                      onClick={item.onClick}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </motion.div>
                ))}

                {/* 블로그 콘텐츠 버튼 */}
                {[
                  { label: '후보자비전스토리', icon: BookOpen, onClick: () => setVisionModalOpen(true) },
                  { label: '공약상세설명', icon: FileText, onClick: () => setPolicyDetailModalOpen(true) },
                  { label: '현장 리포트', icon: FileCheck },
                  { label: '정책팩트체크', icon: CheckCircle2 },
                  { label: '캠페뉴스', icon: Newspaper },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ 
                      delay: 2.2 + index * 0.1, 
                      duration: 0.5,
                      type: "spring",
                      stiffness: 150
                    }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      className="bg-[#03C75A] hover:bg-[#02b051] text-white font-normal gap-2"
                      size="sm"
                      onClick={item.onClick}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.section>

          {/* KPI 그리드 */}
          <section>
            <motion.h2
              className="mb-4 text-lg font-semibold"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              핵심 지표
            </motion.h2>
            <motion.div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {kpiData.map((kpi, i) => (
                <motion.div key={i} variants={itemVariants}>
                  <KPICard
                    label={kpi.label}
                    value={kpi.value}
                    unit={kpi.unit}
                    change={kpi.change}
                    changeLabel={kpi.changeLabel}
                    status={kpi.status}
                    sparkline={kpi.sparkline}
                    source={kpi.source}
                  />
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* 모듈 카드 그리드 */}
          <section>
            <motion.h2
              className="mb-4 text-lg font-semibold"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              모듈 바로가기
            </motion.h2>
            <motion.div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {modules.map((module) => (
                <motion.div
                  key={module.path}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ duration: 0.3 }}
                >
                  <ModuleCard
                    name={module.name}
                    path={module.path}
                    slogan={module.slogan}
                    benefits={module.benefits}
                    kpis={module.kpis}
                    publicUrl={module.publicUrl}
                    thumbnail={module.thumbnail}
                  />
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* 최근 활동 & 알림 */}
          <motion.section
            className="grid gap-6 lg:grid-cols-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* 최근 활동 타임라인 */}
            <motion.div
              className="rounded-2xl border bg-card/90 backdrop-blur-sm p-6"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="mb-4 font-semibold">최근 활동</h3>
              <div className="space-y-4">
                {[
                  { action: '세그먼트 생성', user: '김관리', time: '2분 전', module: 'Hub' },
                  { action: '연설문 수정', user: '박매니저', time: '15분 전', module: 'Studio' },
                  { action: '메시지 발송', user: '김관리', time: '1시간 전', module: 'Hub' },
                  { action: 'SNS 카드 생성', user: '이스태프', time: '2시간 전', module: 'Studio' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm whitespace-nowrap overflow-hidden">
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    <span className="font-medium truncate min-w-0">{item.action}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {item.module}
                    </Badge>
                    <span className="text-muted-foreground truncate min-w-0">{item.user}</span>
                    <span className="ml-auto text-muted-foreground shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* 알림 센터 */}
            <motion.div
              className="rounded-2xl border bg-card/90 backdrop-blur-sm p-6"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            >
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
            </motion.div>
          </motion.section>
        </motion.div>
      </main>

      <AppFooter sidebarCollapsed={sidebarCollapsed} />

      {/* 비디오 모달 */}
      <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black">
          <DialogHeader className="p-4 bg-gradient-to-r from-red-600 to-red-700">
            <DialogTitle className="text-white flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              출마선언 영상
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black">
            {videoModalOpen && (
              <video
                src="/candidate-hong.mp4"
                controls
                autoPlay
                muted
                playsInline
                preload="auto"
                className="w-full h-full object-contain"
                onLoadedData={(e) => {
                  // 비디오 로드 완료 후 음소거 해제 시도
                  const video = e.currentTarget;
                  video.muted = false;
                }}
                onError={(e) => {
                  console.error('비디오 로드 실패:', e);
                  alert('비디오를 불러올 수 없습니다. 파일을 확인해주세요.');
                }}
              >
                <source src="/candidate-hong.mp4" type="video/mp4" />
                브라우저가 비디오 태그를 지원하지 않습니다.
              </video>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 공약하이라이트 비디오 모달 */}
      <Dialog open={audioModalOpen} onOpenChange={setAudioModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black">
          <DialogHeader className="p-4 bg-gradient-to-r from-primary to-primary/80">
            <DialogTitle className="text-white flex items-center gap-2">
              <Video className="h-5 w-5" />
              공약 하이라이트
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black">
            {audioModalOpen && (
              <video
                src="/policy-highlight.mp4"
                controls
                autoPlay
                muted
                playsInline
                preload="auto"
                className="w-full h-full object-contain"
                onLoadedData={(e) => {
                  const video = e.currentTarget;
                  video.muted = false;
                }}
                onError={(e) => {
                  console.error('비디오 로드 실패:', e);
                  alert('비디오를 불러올 수 없습니다. 파일을 확인해주세요.');
                }}
              >
                <source src="/policy-highlight.mp4" type="video/mp4" />
                브라우저가 비디오 태그를 지원하지 않습니다.
              </video>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 이슈에답하다 비디오 모달 */}
      <Dialog open={issueModalOpen} onOpenChange={setIssueModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black">
          <DialogHeader className="p-4 bg-gradient-to-r from-orange-500 to-orange-600">
            <DialogTitle className="text-white flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              이슈에 답하다
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black">
            {issueModalOpen && (
              <video
                src="/issue-answer.mp4"
                controls
                autoPlay
                muted
                playsInline
                preload="auto"
                className="w-full h-full object-contain"
                onLoadedData={(e) => {
                  const video = e.currentTarget;
                  video.muted = false;
                }}
                onError={(e) => {
                  console.error('비디오 로드 실패:', e);
                  alert('비디오를 불러올 수 없습니다. 파일을 확인해주세요.');
                }}
              >
                <source src="/issue-answer.mp4" type="video/mp4" />
                브라우저가 비디오 태그를 지원하지 않습니다.
              </video>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 후보자비전스토리 비디오 모달 */}
      <Dialog open={visionModalOpen} onOpenChange={setVisionModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black">
          <DialogHeader className="p-4 bg-gradient-to-r from-[#03C75A] to-[#02a050]">
            <DialogTitle className="text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              후보자 비전 스토리
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black">
            {visionModalOpen && (
              <video
                src="/vision-story.mp4"
                controls
                autoPlay
                muted
                playsInline
                preload="auto"
                className="w-full h-full object-contain"
                onLoadedData={(e) => {
                  const video = e.currentTarget;
                  video.muted = false;
                }}
                onError={(e) => {
                  console.error('비디오 로드 실패:', e);
                  alert('비디오를 불러올 수 없습니다. 파일을 확인해주세요.');
                }}
              >
                <source src="/vision-story.mp4" type="video/mp4" />
                브라우저가 비디오 태그를 지원하지 않습니다.
              </video>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 공약상세설명 비디오 모달 */}
      <Dialog open={policyDetailModalOpen} onOpenChange={setPolicyDetailModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black">
          <DialogHeader className="p-4 bg-gradient-to-r from-[#03C75A] to-[#02a050]">
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5" />
              공약 상세 설명
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black">
            {policyDetailModalOpen && (
              <video
                src="/policy-detail.mp4"
                controls
                autoPlay
                muted
                playsInline
                preload="auto"
                className="w-full h-full object-contain"
                onLoadedData={(e) => {
                  const video = e.currentTarget;
                  video.muted = false;
                }}
                onError={(e) => {
                  console.error('비디오 로드 실패:', e);
                  alert('비디오를 불러올 수 없습니다. 파일을 확인해주세요.');
                }}
              >
                <source src="/policy-detail.mp4" type="video/mp4" />
                브라우저가 비디오 태그를 지원하지 않습니다.
              </video>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
