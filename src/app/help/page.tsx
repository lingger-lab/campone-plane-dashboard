'use client';

import React, { useState } from 'react';
import {
  HelpCircle,
  BarChart3,
  Palette,
  FileText,
  ClipboardList,
  Users,
  LayoutDashboard,
  Settings,
  ChevronDown,
  ChevronRight,
  Search,
  Bell,
  Link as LinkIcon,
  Image,
  UserCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// 모듈 가이드 데이터
const moduleGuides = [
  {
    id: 'insights',
    icon: BarChart3,
    title: 'Insights (여론 분석)',
    path: '/pulse',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: '실시간 여론 트렌드와 감성 분석을 제공하는 모듈입니다.',
    features: [
      {
        title: '트렌드 지수',
        desc: 'Google 트렌드(30%) + Naver(30%) + SNS(40%)의 가중 합산으로 계산된 종합 여론 지수를 확인합니다.',
      },
      {
        title: '감성 분석',
        desc: 'SNS 데이터를 기반으로 긍정/부정/중립 여론 비율을 분석합니다.',
      },
      {
        title: '이슈 레이더',
        desc: '실시간으로 떠오르는 주요 이슈와 키워드를 모니터링합니다.',
      },
      {
        title: '리스크 경보',
        desc: '부정 여론 급증 시 자동으로 알림을 발송합니다.',
      },
    ],
  },
  {
    id: 'studio',
    icon: Palette,
    title: 'Studio (콘텐츠)',
    path: '/studio',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    description: '캠페인 콘텐츠를 제작하고 관리하는 모듈입니다.',
    features: [
      {
        title: '카드뉴스 제작',
        desc: '템플릿을 활용하여 SNS용 카드뉴스를 빠르게 제작합니다.',
      },
      {
        title: '현수막/배너 디자인',
        desc: '프리셋을 선택하고 텍스트를 입력하여 현수막과 배너를 디자인합니다.',
      },
      {
        title: '변수 치환',
        desc: '지역명, 날짜 등의 변수를 자동으로 치환하여 다양한 버전을 생성합니다.',
      },
      {
        title: '콘텐츠 캘린더',
        desc: '발행 일정을 캘린더로 관리하고 예약 배포합니다.',
      },
    ],
  },
  {
    id: 'policy',
    icon: FileText,
    title: 'Policy Lab (정책)',
    path: '/policy',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    description: '공약과 정책을 체계적으로 관리하는 모듈입니다.',
    features: [
      {
        title: '비전 설정',
        desc: '캠페인의 핵심 비전과 슬로건을 설정합니다.',
      },
      {
        title: '10대 공약 관리',
        desc: '주요 공약을 카테고리별로 정리하고 상세 내용을 작성합니다.',
      },
      {
        title: '근거 자료 연결',
        desc: '각 공약에 통계, 연구자료, 사례 등 근거를 연결합니다.',
      },
      {
        title: '영향/재원 분석',
        desc: '공약 실현 시 예상 영향과 필요 재원을 메모합니다.',
      },
    ],
  },
  {
    id: 'ops',
    icon: ClipboardList,
    title: 'Ops (운영)',
    path: '/ops',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    description: '캠프 운영 일정과 체크리스트를 관리하는 모듈입니다.',
    features: [
      {
        title: '기간별 체크리스트',
        desc: '선거일 기준 D-day 체크리스트를 자동 생성하고 관리합니다.',
      },
      {
        title: '일정 관리',
        desc: '유세, 행사, 미팅 등 캠프 일정을 캘린더로 관리합니다.',
      },
      {
        title: '알림 자동화',
        desc: '중요 일정 전 자동 알림을 설정합니다.',
      },
      {
        title: '역할/권한 연동',
        desc: '담당자별로 업무를 할당하고 진행 상황을 추적합니다.',
      },
    ],
  },
  {
    id: 'hub',
    icon: Users,
    title: 'Civic Hub (시민 소통)',
    path: '/hub',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    description: '시민 질문 응대와 메시지 발송을 관리하는 모듈입니다.',
    features: [
      {
        title: '세그먼트 메시징',
        desc: '연령, 지역, 관심사 등으로 그룹을 나누어 맞춤 메시지를 발송합니다.',
      },
      {
        title: 'A/B 테스트',
        desc: '두 가지 버전의 메시지를 테스트하여 효과를 비교합니다.',
      },
      {
        title: '오픈/응답 추적',
        desc: '메시지 오픈율과 클릭률을 실시간으로 확인합니다.',
      },
      {
        title: 'Q&A 관리',
        desc: '시민 질문을 접수하고 답변을 작성하여 공개합니다.',
      },
    ],
  },
];

// 대시보드 기능 가이드
const dashboardGuides = [
  {
    id: 'main',
    icon: LayoutDashboard,
    title: '메인 대시보드',
    description: '캠페인 현황을 한눈에 파악하는 홈 화면입니다.',
    features: [
      {
        title: '캠페인 프로필',
        desc: '후보자 정보, 경력, 슬로건이 표시됩니다. 설정에서 수정할 수 있습니다.',
      },
      {
        title: '퀵버튼',
        desc: '자주 사용하는 링크(유튜브, 블로그 등)를 버튼으로 빠르게 접근합니다.',
      },
      {
        title: '핵심 지표 (KPI)',
        desc: '여론 트렌드, 긍정 여론, 시민 질문, 공약 발표 등 주요 지표를 확인합니다.',
      },
      {
        title: '모듈 바로가기',
        desc: '5개 핵심 모듈로 빠르게 이동합니다.',
      },
      {
        title: '최근 활동',
        desc: '모듈에서 발생한 최신 활동 로그를 확인합니다.',
      },
      {
        title: '알림 센터',
        desc: '시스템 알림과 중요 공지사항을 확인합니다.',
      },
    ],
  },
  {
    id: 'settings',
    icon: Settings,
    title: '설정',
    description: '대시보드와 캠페인 설정을 관리합니다.',
    features: [
      {
        title: '캠페인 프로필',
        desc: '후보자 이름, 직함, 조직명, 사진, 경력, 슬로건을 설정합니다.',
      },
      {
        title: '채널 링크',
        desc: '사이드바와 푸터에 표시되는 SNS 채널 링크를 관리합니다.',
      },
      {
        title: '퀵버튼',
        desc: '메인 화면에 표시되는 바로가기 버튼을 추가/수정/삭제합니다.',
      },
      {
        title: '연락처 정보',
        desc: '푸터에 표시되는 주소, 전화번호, 이메일, 운영시간을 설정합니다.',
      },
    ],
  },
  {
    id: 'sidebar',
    icon: LinkIcon,
    title: '사이드바',
    description: '모듈 이동과 채널 접근을 위한 네비게이션입니다.',
    features: [
      {
        title: '모듈 메뉴',
        desc: '5개 핵심 모듈로 이동합니다. 각 모듈은 별도의 임베드 페이지로 구성됩니다.',
      },
      {
        title: '채널 링크',
        desc: '설정된 SNS 채널 링크가 아이콘으로 표시됩니다.',
      },
      {
        title: '접기/펼치기',
        desc: '사이드바를 접어 더 넓은 작업 공간을 확보할 수 있습니다.',
      },
    ],
  },
];

// 자주 묻는 질문
const faqs = [
  {
    q: '모듈 페이지가 로딩되지 않아요',
    a: '각 모듈은 외부 시스템과 연동됩니다. 네트워크 연결을 확인하고, 페이지를 새로고침해 주세요.',
  },
  {
    q: '여론 지수는 어떻게 계산되나요?',
    a: 'Google 트렌드(30%) + Naver 검색량(30%) + SNS 언급량(40%)의 가중 합산으로 계산됩니다.',
  },
  {
    q: '설정을 변경했는데 반영이 안 돼요',
    a: '저장 버튼을 누른 후 페이지를 새로고침하면 변경사항이 반영됩니다.',
  },
  {
    q: '퀵버튼에 동영상 링크를 추가하고 싶어요',
    a: '설정 > 퀵버튼에서 URL에 .mp4 파일 경로를 입력하면 클릭 시 모달로 재생됩니다.',
  },
  {
    q: '다크 모드는 어떻게 설정하나요?',
    a: '화면 하단 푸터의 테마 설정에서 라이트/다크/시스템 모드를 선택할 수 있습니다.',
  },
  {
    q: '권한이 없다고 표시돼요',
    a: 'Admin 또는 Manager 권한이 필요한 기능입니다. 관리자에게 권한을 요청하세요.',
  },
];

// 확장 가능한 섹션 컴포넌트
function ExpandableSection({
  icon: Icon,
  title,
  description,
  features,
  color,
  bgColor,
  defaultExpanded = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  features: { title: string; desc: string }[];
  color?: string;
  bgColor?: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className={cn('p-2 rounded-lg', bgColor || 'bg-primary/10')}>
              <Icon className={cn('h-5 w-5', color || 'text-primary')} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {expanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardContent>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="border-t pt-4 space-y-3">
            {features.map((feature, i) => (
              <div key={i} className="pl-12">
                <h4 className="text-sm font-medium">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // 검색 필터링
  const filteredModules = moduleGuides.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.features.some(
        (f) =>
          f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const filteredDashboard = dashboardGuides.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.features.some(
        (f) =>
          f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-8">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <HelpCircle className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold">도움말 센터</h1>
        <p className="text-muted-foreground">CampOne 대시보드 사용 가이드</p>
      </div>

      {/* 검색 */}
      <div className="max-w-md mx-auto relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="검색어를 입력하세요..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 모듈 가이드 */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          모듈 가이드
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          각 모듈을 클릭하여 상세 기능을 확인하세요.
        </p>
        <div className="space-y-3">
          {filteredModules.map((module) => (
            <ExpandableSection
              key={module.id}
              icon={module.icon}
              title={module.title}
              description={module.description}
              features={module.features}
              color={module.color}
              bgColor={module.bgColor}
            />
          ))}
        </div>
      </section>

      {/* 대시보드 기능 */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          대시보드 기능
        </h2>
        <div className="space-y-3">
          {filteredDashboard.map((guide) => (
            <ExpandableSection
              key={guide.id}
              icon={guide.icon}
              title={guide.title}
              description={guide.description}
              features={guide.features}
            />
          ))}
        </div>
      </section>

      {/* 자주 묻는 질문 */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              자주 묻는 질문
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, i) => (
                <div key={i} className="border-b last:border-0 pb-4 last:pb-0">
                  <h4 className="font-medium mb-1">{faq.q}</h4>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                검색 결과가 없습니다.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 버전 정보 */}
      <div className="text-center text-xs text-muted-foreground pt-4">
        <p>CampOne Dashboard v1.0.0</p>
      </div>
    </div>
  );
}
