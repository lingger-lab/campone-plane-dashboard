'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
  ExternalLink,
  LucideIcon,
} from 'lucide-react';
import { useQuickButtons, QuickButton } from '@/hooks/useQuickButtons';
import { AppHeader, Sidebar, AppFooter } from '@/components/layout';
import { KPICard, ModuleCard, RecentActivity, AlertCenter } from '@/components/dashboard';
import { useModuleMessages } from '@/hooks/useModuleMessages';
import { useKpiAll, KpiData } from '@/hooks/useKpi';
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
    thumbnail: '/module-i.png',
  },
  {
    name: 'Studio',
    path: '/studio',
    slogan: '콘텐츠 제작·배포, 한 번에.',
    benefits: ['카드/공지 템플릿', '변수치환/버전관리', '캘린더 연동 퍼블리시'],
    thumbnail: '/module-s.png',
  },
  {
    name: 'Policy Lab',
    path: '/policy',
    slogan: '비전부터 근거까지, 구조화.',
    benefits: ['비전/10대 공약', '근거/사례 링크', '영향·재원 메모'],
    thumbnail: '/module-p.png',
  },
  {
    name: 'Ops',
    path: '/ops',
    slogan: '캠프 운영, 체크리스트 한 장.',
    benefits: ['기간별 체크', '알림/런북 자동화', '역할/권한 연동'],
    thumbnail: '/module-o.png',
  },
  {
    name: 'Civic Hub',
    path: '/hub',
    slogan: '질문엔 답하고, 메시지는 도달한다.',
    benefits: ['세그먼트 메시징(A/B·예약)', '오픈/응답 추적', '인바운드 Q&A/민원함'],
    thumbnail: '/module-c.png',
  },
];

// KPI 설정: DB 키와 표시 라벨 매핑 + 기본값
interface KpiConfig {
  dbKey: string; // format: "module:key"
  label: string;
  unit?: string;
  changeLabel: string;
  source?: string;
  defaultValue: number | string;
  defaultChange?: number;
  defaultSparkline?: number[];
}

const KPI_CONFIG: KpiConfig[] = [
  {
    dbKey: 'Insights:trend_index',
    label: '여론 트렌드',
    unit: 'pt',
    changeLabel: '전주 대비',
    source: 'GT/Naver/SNS',
    defaultValue: 0,
    defaultChange: 0,
  },
  {
    dbKey: 'Insights:positive_ratio',
    label: '긍정 여론',
    unit: '%',
    changeLabel: '전주 대비',
    source: 'SNS 분석',
    defaultValue: 0,
    defaultChange: 0,
  },
  {
    dbKey: 'Hub:total_questions',
    label: '시민 질문',
    unit: '건',
    changeLabel: '누적',
    source: 'Civic Hub',
    defaultValue: 0,
    defaultChange: 0,
  },
  {
    dbKey: 'Policy:pledges_published',
    label: '공약 발표',
    unit: '건',
    changeLabel: '진행률',
    source: 'Policy Lab',
    defaultValue: 0,
    defaultChange: 0,
  },
];

// 퀵버튼 아이콘 매핑
const QUICK_BUTTON_ICONS: Record<string, LucideIcon> = {
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
  List,
  ExternalLink,
};

// 퀵버튼 카테고리별 스타일
const CATEGORY_STYLES = {
  primary: 'bg-primary hover:bg-primary/90 text-white',
  video: 'bg-red-600 hover:bg-red-700 text-white',
  blog: 'bg-[#03C75A] hover:bg-[#02b051] text-white',
  default: 'bg-muted text-muted-foreground hover:bg-muted/80',
};

// URL이 비디오인지 확인
const isVideoUrl = (url: string) => url.endsWith('.mp4') || url.endsWith('.webm');

// URL이 외부 링크인지 확인
const isExternalUrl = (url: string) => url.startsWith('http://') || url.startsWith('https://');

// DB의 KPI 데이터를 화면에 표시할 형식으로 변환
function mapKpiToDisplay(
  config: KpiConfig,
  kpiList: KpiData[]
): {
  label: string;
  value: number | string;
  unit?: string;
  change: number;
  changeLabel: string;
  status: 'success' | 'warning' | 'danger';
  source?: string;
  sparkline?: number[];
} {
  // DB에서 해당 KPI 찾기
  const [moduleName, key] = config.dbKey.split(':');
  const kpiData = kpiList.find(
    (k) => k.module === moduleName && k.key === key
  );

  // 값 결정 (DB에 있으면 사용, 없으면 기본값)
  const value = kpiData?.value?.value ?? config.defaultValue;
  const change = kpiData?.value?.change ?? config.defaultChange ?? 0;
  const unit = kpiData?.value?.unit ?? config.unit;

  // 상태 결정: change 값에 따라
  let status: 'success' | 'warning' | 'danger' = 'success';
  if (change < 0) {
    status = 'warning';
  } else if (change < -20) {
    status = 'danger';
  }

  // changeLabel 업데이트 (실제 데이터가 있을 때)
  let changeLabel = config.changeLabel;
  if (kpiData?.value?.unit === '%' && config.dbKey === 'Hub:messages_sent') {
    changeLabel = `오픈율 ${value}%`;
  }

  return {
    label: config.label,
    value,
    unit,
    change,
    changeLabel,
    status,
    source: config.source,
    sparkline: config.defaultSparkline,
  };
}

export default function DashboardPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 동적 비디오 모달 상태
  const [videoModal, setVideoModal] = useState<{ open: boolean; url: string; label: string }>({
    open: false,
    url: '',
    label: '',
  });

  // iframe 모듈들로부터 메시지 수신 (활동/알림 자동 저장)
  useModuleMessages({
    onReady: (source) => console.log(`[Dashboard] ${source} module ready`),
  });

  // KPI 데이터 조회 (1분마다 자동 갱신)
  const { data: kpiResponse, isLoading: kpiLoading } = useKpiAll();

  // 퀵버튼 데이터 조회
  const { data: quickButtonsData } = useQuickButtons();
  const quickButtons = quickButtonsData?.buttons || [];

  // KPI 설정과 DB 데이터를 매핑하여 표시용 데이터 생성
  const kpiData = useMemo(() => {
    const kpiList = kpiResponse?.kpi || [];
    return KPI_CONFIG.map((config) => mapKpiToDisplay(config, kpiList));
  }, [kpiResponse]);

  // 퀵버튼 클릭 핸들러
  const handleQuickButtonClick = useCallback((button: QuickButton) => {
    if (isVideoUrl(button.url)) {
      // 비디오 URL이면 모달 열기
      setVideoModal({ open: true, url: button.url, label: button.label });
    } else if (isExternalUrl(button.url)) {
      // 외부 링크면 새 탭에서 열기
      window.open(button.url, '_blank');
    } else if (button.url !== '#') {
      // 내부 링크면 이동
      window.location.href = button.url;
    }
  }, []);

  // 퀵버튼 아이콘 렌더링
  const renderButtonIcon = useCallback((iconName: string | null) => {
    if (!iconName) return null;
    const IconComponent = QUICK_BUTTON_ICONS[iconName];
    if (!IconComponent) return null;
    return <IconComponent className="h-4 w-4" />;
  }, []);

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
                    src="/candidate.jpg"
                    alt="유해남 후보"
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
                  유
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
                        유해남 후보 선거대책본부
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
                        사천시장 후보
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
                        { icon: Users, text: '사천시 당협위원장' },
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

            {/* 모바일 CTA 영역 - 동적 퀵버튼 */}
            <motion.div
              className="mt-4 space-y-3 sm:hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.6 }}
            >
              {/* 메인 CTA - primary 카테고리 버튼 (첫 번째만) */}
              {quickButtons.filter(b => b.category === 'primary').slice(0, 1).map((button) => (
                <motion.div
                  key={button.id}
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
                    onClick={() => handleQuickButtonClick(button)}
                  >
                    {renderButtonIcon(button.icon)}
                    <span className="ml-2">{button.label}</span>
                  </Button>
                </motion.div>
              ))}

              {/* 2x2 그리드 - 영상 콘텐츠 (video 카테고리, 최대 4개) */}
              <div className="grid grid-cols-2 gap-2">
                {quickButtons.filter(b => b.category === 'video').slice(0, 4).map((button, index) => (
                  <motion.div
                    key={button.id}
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
                      className="py-3 h-auto rounded-lg font-medium w-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                      variant="ghost"
                      onClick={() => handleQuickButtonClick(button)}
                    >
                      {renderButtonIcon(button.icon)}
                      <span className="ml-1.5">{button.label}</span>
                    </Button>
                  </motion.div>
                ))}
              </div>

              {/* 텍스트 링크 - 블로그 콘텐츠 */}
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground pt-1">
                {quickButtons.filter(b => b.category === 'blog').slice(0, 4).map((button, index) => (
                  <React.Fragment key={button.id}>
                    {index > 0 && <span className="text-border">·</span>}
                    <button
                      onClick={() => handleQuickButtonClick(button)}
                      className="hover:text-primary transition-colors"
                    >
                      {button.label}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </motion.div>

            {/* 데스크탑 CTA 영역 - 동적 퀵버튼 */}
            <motion.div
              className="hidden sm:block mt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.6 }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                {quickButtons.map((button, index) => (
                  <motion.div
                    key={button.id}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      delay: 1.6 + index * 0.05,
                      duration: 0.5,
                      type: "spring",
                      stiffness: 150
                    }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      className={cn(
                        "font-normal gap-2",
                        button.category === 'primary' && "font-medium h-9 px-4 rounded-lg",
                        CATEGORY_STYLES[button.category] || CATEGORY_STYLES.default
                      )}
                      size={button.category === 'primary' ? 'default' : 'sm'}
                      onClick={() => handleQuickButtonClick(button)}
                    >
                      {renderButtonIcon(button.icon)}
                      {button.label}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.section>

          {/* KPI 그리드 */}
          <section>
            <motion.div
              className="mb-4 flex items-center gap-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <h2 className="text-lg font-semibold">핵심 지표</h2>
              {kpiLoading && (
                <span className="text-xs text-muted-foreground animate-pulse">
                  로딩 중...
                </span>
              )}
              {!kpiLoading && kpiResponse?.kpi?.length === 0 && (
                <Badge variant="outline" className="text-xs">
                  데이터 대기 중
                </Badge>
              )}
            </motion.div>
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
            <RecentActivity />
            <AlertCenter />
          </motion.section>
        </motion.div>
      </main>

      <AppFooter sidebarCollapsed={sidebarCollapsed} />

      {/* 동적 비디오 모달 */}
      <Dialog
        open={videoModal.open}
        onOpenChange={(open) => setVideoModal({ ...videoModal, open })}
      >
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black">
          <DialogHeader className="p-4 bg-gradient-to-r from-red-600 to-red-700">
            <DialogTitle className="text-white flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              {videoModal.label}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black">
            {videoModal.open && videoModal.url && (
              <video
                key={videoModal.url}
                src={videoModal.url}
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
                <source src={videoModal.url} type="video/mp4" />
                브라우저가 비디오 태그를 지원하지 않습니다.
              </video>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
