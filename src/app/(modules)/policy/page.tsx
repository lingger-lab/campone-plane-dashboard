'use client';

import React from 'react';
import Link from 'next/link';

// 10대 공약 카드 데이터
const policyCards = [
  {
    category: '경제/일자리',
    title: '청년 창업 지원센터 설립',
    description: '창녕군 청년 창업 인큐베이팅 허브 조성',
    status: '추진중',
    statusColor: '#9FE870',
    progress: 75,
    href: '#',
  },
  {
    category: '복지/돌봄',
    title: '24시간 안심돌봄 서비스',
    description: '독거노인·장애인 맞춤형 돌봄체계 구축',
    status: '검토중',
    statusColor: '#FBBF24',
    progress: 45,
    href: '#',
  },
  {
    category: '교육/문화',
    title: '창녕 교육특구 지정 추진',
    description: '우수 교원 유치·교육환경 개선 종합계획',
    status: '추진중',
    statusColor: '#9FE870',
    progress: 60,
    href: '#',
  },
  {
    category: '농업/특산',
    title: '스마트팜 혁신단지 조성',
    description: 'ICT 융합 농업기술 보급·교육센터 건립',
    status: '계획중',
    statusColor: '#60A5FA',
    progress: 30,
    href: '#',
  },
  {
    category: '교통/인프라',
    title: '광역교통망 확충 사업',
    description: '창녕↔대구·부산 광역버스 노선 신설',
    status: '협의중',
    statusColor: '#FBBF24',
    progress: 50,
    href: '#',
  },
  {
    category: '환경/에너지',
    title: '탄소중립 그린시티 선언',
    description: '신재생에너지 보급·친환경 공공시설 전환',
    status: '추진중',
    statusColor: '#9FE870',
    progress: 65,
    href: '#',
  },
  {
    category: '관광/레저',
    title: '우포늪 생태관광벨트 조성',
    description: '람사르습지 연계 관광인프라 확충',
    status: '추진중',
    statusColor: '#9FE870',
    progress: 80,
    href: '#',
  },
  {
    category: '의료/건강',
    title: '공공의료센터 유치',
    description: '응급의료 접근성 강화·전문의 확보',
    status: '검토중',
    statusColor: '#FBBF24',
    progress: 40,
    href: '#',
  },
  {
    category: '안전/재난',
    title: '스마트 재난관리 시스템',
    description: 'AI 기반 재난예측·신속대응 체계 구축',
    status: '계획중',
    statusColor: '#60A5FA',
    progress: 25,
    href: '#',
  },
  {
    category: '행정/소통',
    title: '주민참여 예산제 확대',
    description: '주민 직접 제안·투표로 예산 편성 참여',
    status: '추진중',
    statusColor: '#9FE870',
    progress: 70,
    href: '#',
  },
];

export default function PolicyLabPage() {
  return (
    <section className="min-h-screen p-5 sm:p-10 bg-slate-50">
      <div className="max-w-[1200px] mx-auto text-slate-900">
        <h2 className="text-2xl sm:text-[28px] font-bold mb-2">홍길동 후보 10대 핵심공약</h2>
        <p className="text-slate-600 mb-6">비전부터 근거까지 구조화된 정책 로드맵 — 진행현황 실시간 업데이트</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {policyCards.map((card, index) => (
            <Link
              key={index}
              href={card.href}
              className="bg-white border border-slate-200 rounded-2xl p-4 no-underline text-slate-900 hover:border-emerald-500 hover:scale-[1.02] hover:shadow-md transition-all duration-200 flex flex-col"
            >
              <div className="text-xs text-slate-500">{card.category}</div>
              <div className="font-bold my-2 text-sm leading-tight flex-1">{card.title}</div>
              <div className="text-xs text-slate-600 mb-3">{card.description}</div>

              {/* 진행률 바 */}
              <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2">
                <div
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${card.progress}%`, backgroundColor: card.statusColor === '#9FE870' ? '#16a34a' : card.statusColor === '#FBBF24' ? '#d97706' : '#2563eb' }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-medium"
                  style={{ color: card.statusColor === '#9FE870' ? '#16a34a' : card.statusColor === '#FBBF24' ? '#d97706' : '#2563eb' }}
                >
                  {card.status}
                </span>
                <span className="text-xs text-slate-500">{card.progress}%</span>
              </div>
            </Link>
          ))}
        </div>

        {/* 요약 통계 */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600">5</div>
            <div className="text-xs text-slate-500 mt-1">추진중</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-amber-600">3</div>
            <div className="text-xs text-slate-500 mt-1">검토/협의중</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-blue-600">2</div>
            <div className="text-xs text-slate-500 mt-1">계획중</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-slate-900">54%</div>
            <div className="text-xs text-slate-500 mt-1">평균 진행률</div>
          </div>
        </div>
      </div>
    </section>
  );
}
