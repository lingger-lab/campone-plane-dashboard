'use client';

import React from 'react';
import Link from 'next/link';

// 이슈 트렌드 카드 데이터
const trendCards = [
  {
    category: '재정/국도비',
    title: '2027 국·도비 3,182억 발굴',
    description: '생활폐기물·풍수해·폐수처리 등',
    trend: '중·상 ▲',
    trendColor: '#9FE870',
    href: 'https://www.newsis.com/view/NISX20251222_0003450258',
  },
  {
    category: '집행/성과',
    title: "'26 상반기 신속집행 목표",
    description: '1Q 33% · 2Q 60%',
    trend: '중 ▲',
    trendColor: '#9FE870',
    href: 'https://news.nate.com/view/20251216n10034',
  },
  {
    category: '산업/투자',
    title: "항공소재 공장 '27 가동목표",
    description: 'SeAH ↔ Boeing 공급망 연계',
    trend: '중 ▲',
    trendColor: '#9FE870',
    href: 'https://www.alcircle.com/news/seah-aerospace-partners-with-boeing-to-supply-aluminium-alloy-from-26-116593',
  },
  {
    category: '안보/재난',
    title: '통합방위협의회(12/16)',
    description: "'26 민방위 계획 심의·점검",
    trend: '중 →',
    trendColor: '#FBBF24',
    href: 'https://gyeongnampost.com/post/QEYT76ux',
  },
  {
    category: '전통시장',
    title: '남지시장 지원·개장 로드맵',
    description: "정식 개장 '26.5 목표",
    trend: '중 ▲',
    trendColor: '#9FE870',
    href: 'https://www.kmunews.co.kr/news/articleView.html?idxno=296987',
  },
  {
    category: '군정 비전',
    title: "신년사: '주마가편' 실행",
    description: '현안 속도감 있게 추진 선언',
    trend: '중 →',
    trendColor: '#60A5FA',
    href: 'https://v.daum.net/v/20251231100612944',
  },
];

export default function InsightsPage() {
  return (
    <section className="min-h-screen p-5 sm:p-10 bg-slate-50">
      <div className="max-w-[1100px] mx-auto text-slate-900">
        <h2 className="text-2xl sm:text-[28px] font-bold mb-2">창녕군 30일 이슈 트렌드</h2>
        <p className="text-slate-600 mb-6">웹검색 기반 데모 요약 — 최근 보도 중심, 핵심성과/중요성 강조</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {trendCards.map((card, index) => (
            <Link
              key={index}
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white border border-slate-200 rounded-2xl p-4 no-underline text-slate-900 hover:border-blue-500 hover:scale-[1.02] hover:shadow-md transition-all duration-200"
            >
              <div className="text-xs text-slate-500">{card.category}</div>
              <div className="font-bold my-2 text-sm leading-tight">{card.title}</div>
              <div className="text-xs text-slate-600">{card.description}</div>
              <div
                className="mt-3 text-xs font-medium"
                style={{ color: card.trendColor === '#9FE870' ? '#16a34a' : card.trendColor === '#FBBF24' ? '#d97706' : '#2563eb' }}
              >
                {card.trend}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
