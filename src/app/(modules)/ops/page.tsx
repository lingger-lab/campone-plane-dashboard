'use client';

import React from 'react';

// 운영 체크리스트 카드 데이터
const opsCards = [
  {
    category: 'D-30',
    title: '선거사무소 개소식',
    description: '장소 확정·초청장 발송·언론 배포',
    status: '완료',
    statusColor: '#9FE870',
    assignee: '김관리',
    dueDate: '01/10',
  },
  {
    category: 'D-25',
    title: '유세차량 랩핑 완료',
    description: '디자인 확정·시공·안전점검',
    status: '완료',
    statusColor: '#9FE870',
    assignee: '박매니저',
    dueDate: '01/15',
  },
  {
    category: 'D-20',
    title: '현수막/명함 인쇄',
    description: '디자인 검수·수량 확인·배포계획',
    status: '진행중',
    statusColor: '#FBBF24',
    assignee: '이스태프',
    dueDate: '01/20',
  },
  {
    category: 'D-15',
    title: '거리유세 일정 확정',
    description: '주요 상권·시장·아파트단지 순회',
    status: '진행중',
    statusColor: '#FBBF24',
    assignee: '김관리',
    dueDate: '01/25',
  },
  {
    category: 'D-10',
    title: '타운홀 미팅 준비',
    description: '장소섭외·참석자 모집·진행대본',
    status: '대기중',
    statusColor: '#60A5FA',
    assignee: '최기획',
    dueDate: '01/30',
  },
  {
    category: 'D-7',
    title: '최종 TV토론 준비',
    description: '예상질문·답변 정리·모의토론',
    status: '대기중',
    statusColor: '#60A5FA',
    assignee: '박매니저',
    dueDate: '02/03',
  },
  {
    category: 'D-5',
    title: '선거인단 동원 점검',
    description: '지역별 인원현황·연락망 확인',
    status: '대기중',
    statusColor: '#60A5FA',
    assignee: '김관리',
    dueDate: '02/05',
  },
  {
    category: 'D-3',
    title: '최종 홍보물 배포',
    description: '전단지·명함·소책자 최종배포',
    status: '대기중',
    statusColor: '#60A5FA',
    assignee: '이스태프',
    dueDate: '02/07',
  },
  {
    category: 'D-1',
    title: '투표참여 독려 캠페인',
    description: 'SNS·문자·전화 최종 독려',
    status: '대기중',
    statusColor: '#60A5FA',
    assignee: '전체',
    dueDate: '02/09',
  },
  {
    category: 'D-Day',
    title: '투표일 현장 운영',
    description: '투표소 인근 활동·개표 모니터링',
    status: '대기중',
    statusColor: '#60A5FA',
    assignee: '전체',
    dueDate: '02/10',
  },
];

// 긴급 알림
const urgentAlerts = [
  { type: 'warning', message: '현수막 인쇄 지연 - 업체 확인 필요', time: '2시간 전' },
  { type: 'info', message: '타운홀 장소 후보 3곳 검토 완료', time: '4시간 전' },
  { type: 'success', message: '유세차량 안전점검 통과', time: '1일 전' },
];

export default function OpsPage() {
  const completed = opsCards.filter(c => c.status === '완료').length;
  const inProgress = opsCards.filter(c => c.status === '진행중').length;
  const waiting = opsCards.filter(c => c.status === '대기중').length;

  return (
    <section className="min-h-screen p-5 sm:p-10 bg-slate-50">
      <div className="max-w-[1200px] mx-auto text-slate-900">
        <h2 className="text-2xl sm:text-[28px] font-bold mb-2">캠프 운영 체크리스트</h2>
        <p className="text-slate-600 mb-6">D-Day까지 핵심 업무 진행현황 — 기간별 체크·알림·역할 연동</p>

        {/* 긴급 알림 */}
        <div className="mb-6 space-y-2">
          {urgentAlerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm ${
                alert.type === 'warning' ? 'bg-amber-50 border border-amber-200 text-amber-800' :
                alert.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
                'bg-blue-50 border border-blue-200 text-blue-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${
                  alert.type === 'warning' ? 'bg-amber-500' :
                  alert.type === 'success' ? 'bg-green-500' :
                  'bg-blue-500'
                }`} />
                <span>{alert.message}</span>
              </div>
              <span className="text-xs opacity-60">{alert.time}</span>
            </div>
          ))}
        </div>

        {/* 운영 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {opsCards.map((card, index) => (
            <div
              key={index}
              className="bg-white border border-slate-200 rounded-2xl p-4 text-slate-900 hover:border-amber-500 hover:scale-[1.02] hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{card.category}</span>
                <span className="text-xs text-slate-500">{card.dueDate}</span>
              </div>
              <div className="font-bold text-sm leading-tight flex-1 mb-1">{card.title}</div>
              <div className="text-xs text-slate-600 mb-3">{card.description}</div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-xs text-slate-500">{card.assignee}</span>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    color: card.statusColor === '#9FE870' ? '#16a34a' : card.statusColor === '#FBBF24' ? '#d97706' : '#2563eb',
                    backgroundColor: card.statusColor === '#9FE870' ? '#dcfce7' : card.statusColor === '#FBBF24' ? '#fef3c7' : '#dbeafe'
                  }}
                >
                  {card.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 요약 통계 */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-600">{completed}</div>
            <div className="text-xs text-slate-500 mt-1">완료</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-amber-600">{inProgress}</div>
            <div className="text-xs text-slate-500 mt-1">진행중</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{waiting}</div>
            <div className="text-xs text-slate-500 mt-1">대기중</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-slate-900">{Math.round((completed / opsCards.length) * 100)}%</div>
            <div className="text-xs text-slate-500 mt-1">전체 완료율</div>
          </div>
        </div>

        {/* 팀 현황 */}
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4">담당자별 업무 현황</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['김관리', '박매니저', '이스태프', '최기획'].map((name) => {
              const tasks = opsCards.filter(c => c.assignee === name);
              const done = tasks.filter(c => c.status === '완료').length;
              return (
                <div key={name} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="font-semibold text-sm mb-2">{name}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{ width: tasks.length > 0 ? `${(done / tasks.length) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{done}/{tasks.length}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
