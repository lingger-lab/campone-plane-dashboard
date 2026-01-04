'use client';

import React, { useState } from 'react';

// CampOne — 콘텐츠(글/이미지/간단영상) 자동 제작 & 유튜브/블로그/카카오 배포 데모

const nowISO = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 9);

const PLACEHOLDER = {
  image: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=1200&auto=format&fit=crop',
  videoThumb: 'https://images.unsplash.com/photo-1527090496-34671591f3f2?q=80&w=1200&auto=format&fit=crop',
};

const CHANNELS = [
  { key: 'youtube', name: 'YouTube', color: '#FF0000' },
  { key: 'naverBlog', name: 'Naver Blog', color: '#03C75A' },
  { key: 'kakao', name: 'KakaoTalk', color: '#FEE500' },
];

type BadgeTone = 'neutral' | 'info' | 'success' | 'warn' | 'danger';

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: BadgeTone }) {
  const tones: Record<BadgeTone, string> = {
    neutral: 'bg-gray-100 text-gray-700',
    info: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    warn: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${tones[tone]}`}>{children}</span>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <span className="relative inline-block h-5 w-10 rounded-full bg-gray-300 transition">
        <input
          aria-label={label}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${checked ? 'translate-x-5' : 'translate-x-1'}`}></span>
      </span>
      <span className="select-none text-sm text-gray-700">{label}</span>
    </label>
  );
}

interface ContentItem {
  id: string;
  kind: 'post' | 'image' | 'video';
  title: string;
  body: string;
  thumb: string;
  status: 'draft' | 'scheduled' | 'published' | 'approved';
  hashtags: string[];
}

interface QueueItem {
  id: string;
  itemId: string;
  schedAt: Date;
  channels: typeof CHANNELS;
  status: 'scheduled' | 'published';
}

interface LogItem {
  time: string;
  msg: string;
}

export default function StudioPage() {
  const [route, setRoute] = useState<'landing' | 'dashboard'>('landing');
  return route === 'landing' ? (
    <Landing onStart={() => setRoute('dashboard')} />
  ) : (
    <Dashboard onBack={() => setRoute('landing')} />
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-blue-500"></div>
          <span className="text-lg font-bold">CampOne</span>
        </div>
        <nav className="hidden gap-6 md:flex">
          <a className="text-slate-600 hover:text-slate-900" href="#features">기능</a>
          <a className="text-slate-600 hover:text-slate-900" href="#how">자동화</a>
          <a className="text-slate-600 hover:text-slate-900" href="#demo">데모</a>
        </nav>
        <button onClick={onStart} className="rounded-2xl bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-600">대시보드 열기</button>
      </header>

      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-14 md:grid-cols-2">
        <div>
          <h1 className="mb-3 text-4xl font-extrabold leading-tight md:text-5xl">
            콘텐츠 제작·배포를 <span className="text-blue-600">한 번에</span>
          </h1>
          <p className="mb-6 max-w-xl text-slate-600">
            글/이미지/짧은 영상까지 자동으로 만들고, YouTube·Naver Blog·KakaoTalk에 자동·반자동으로 배포하세요. 클릭 한 번으로 캠프 홍보 루프가 돌아갑니다.
          </p>
          <ul className="mb-8 space-y-2 text-sm text-slate-600">
            <li>• 프롬프트 → 초안 3종 자동 생성</li>
            <li>• 워크플로: 승인(반자동) 또는 즉시 게시(자동)</li>
            <li>• 채널별 썸네일·태그·해시태그 최적화</li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <button onClick={onStart} className="rounded-2xl bg-blue-500 px-5 py-2.5 font-semibold text-white hover:bg-blue-600">지금 데모 실행</button>
            <a href="#features" className="rounded-2xl border border-slate-300 px-5 py-2.5 font-semibold hover:bg-slate-100">자세히 보기</a>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <img src={PLACEHOLDER.videoThumb} alt="hero" className="h-full w-full object-cover"/>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Badge tone="info">Auto</Badge>
              <Badge tone="success">YouTube</Badge>
              <Badge tone="neutral">Blog</Badge>
              <Badge tone="neutral">Kakao</Badge>
            </div>
            <button onClick={onStart} className="text-sm text-blue-600 underline hover:text-blue-800">대시보드로 이동 →</button>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="mb-4 text-2xl font-bold">왜 필요한가?</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoCard title="시간 절약" desc="초안 자동 생성으로 제작 착수 시간을 70% 절감(가상 데모)"/>
          <InfoCard title="채널 최적화" desc="플랫폼별 포맷/태그에 맞춘 템플릿"/>
          <InfoCard title="측정 가능" desc="예약·게시·성공까지 로그로 추적"/>
        </div>
      </section>
    </main>
  );
}

function InfoCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
      <h3 className="mb-1 font-semibold">{title}</h3>
      <p className="text-slate-600 text-sm">{desc}</p>
    </div>
  );
}

function Dashboard({ onBack }: { onBack: () => void }) {
  const [prompt, setPrompt] = useState('창녕군 신년 시정 메시지 요약과 현장 일정 하이라이트');
  const [autoMode, setAutoMode] = useState(true);
  const [connected, setConnected] = useState<Record<string, boolean>>({ youtube: true, naverBlog: true, kakao: true });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [log, setLog] = useState<LogItem[]>([{ time: nowISO(), msg: '대시보드 진입' }]);

  const addLog = (msg: string) => setLog((l) => [{ time: nowISO(), msg }, ...l].slice(0, 50));

  function generate() {
    const drafts: ContentItem[] = [
      {
        id: uid(),
        kind: 'post',
        title: `칼럼｜${prompt.slice(0, 14)}…`,
        body: `${prompt} — 핵심 3줄 요약, 현장 이미지를 포함한 블로그 글 초안입니다.`,
        thumb: PLACEHOLDER.image,
        status: 'draft',
        hashtags: ['#창녕군', '#현장일정', '#캠프'],
      },
      {
        id: uid(),
        kind: 'image',
        title: `카드뉴스｜${prompt.slice(0, 10)} 키포인트 4`,
        body: '정사각형 카드 4컷(문구·숫자 강조).',
        thumb: PLACEHOLDER.image,
        status: 'draft',
        hashtags: ['#카드뉴스', '#요약'],
      },
      {
        id: uid(),
        kind: 'video',
        title: `60초 쇼츠｜${prompt.slice(0, 12)}`,
        body: '인트로 2s → 본문 50s → 아웃트로 8s (자막 자동 배치 가정).',
        thumb: PLACEHOLDER.videoThumb,
        status: 'draft',
        hashtags: ['#Shorts', '#브리핑'],
      },
    ];
    setItems((prev) => [...drafts, ...prev]);
    addLog(`초안 ${drafts.length}건 생성`);
  }

  function schedulePublish(it: ContentItem) {
    const schedAt = new Date(Date.now() + 2000);
    const activeChannelsList = CHANNELS.filter((c) => connected[c.key]);
    setQueue((q) => [{ id: uid(), itemId: it.id, schedAt, channels: activeChannelsList, status: 'scheduled' }, ...q]);
    updateItem(it.id, { status: 'scheduled' });
    addLog(`예약: ${it.title} → ${activeChannelsList.map((c) => c.name).join(', ')}`);

    setTimeout(() => {
      updateItem(it.id, { status: 'published' });
      setQueue((q) => q.map((row) => (row.itemId === it.id ? { ...row, status: 'published' } : row)));
      addLog(`게시 완료: ${it.title}`);
    }, 2000);
  }

  function updateItem(id: string, patch: Partial<ContentItem>) {
    setItems((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="rounded-xl border px-3 py-1.5 text-sm hover:bg-slate-50">← 랜딩</button>
            <div className="h-7 w-7 rounded-xl bg-blue-600"></div>
            <strong>CampOne · 콘텐츠 자동화</strong>
            <Badge tone="info">데모</Badge>
          </div>
          <div className="flex items-center gap-4">
            <Toggle checked={autoMode} onChange={setAutoMode} label={autoMode ? '자동 게시' : '반자동(승인필요)'} />
            <div className="hidden items-center gap-2 md:flex">
              {CHANNELS.map((ch) => (
                <button
                  key={ch.key}
                  onClick={() => setConnected((s) => ({ ...s, [ch.key]: !s[ch.key] }))}
                  className={`rounded-full border px-3 py-1 text-sm ${connected[ch.key] ? 'bg-white' : 'bg-slate-100 opacity-70'}`}
                  title={`${ch.name} 연결 토글`}
                >
                  <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: connected[ch.key] ? ch.color : '#cbd5e1' }}></span>
                  {ch.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-lg font-bold">콘텐츠 생성기</h2>
            <p className="mb-3 text-sm text-slate-500">프롬프트를 입력하면 글/이미지/짧은 영상 초안 3종이 생성됩니다.</p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="h-24 w-full resize-none rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예) 창녕군 최근 30일 주요 이슈 간단 요약"
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Badge tone="neutral">프롬프트→초안3</Badge>
                <Badge tone="neutral">태그 자동</Badge>
              </div>
              <div className="flex gap-2">
                <button onClick={generate} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">초안 생성</button>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {items.map((it) => (
              <article key={it.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="aspect-video w-full bg-slate-100">
                  <img src={it.thumb} alt="preview" className="h-full w-full object-cover" />
                </div>
                <div className="p-4">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <h3 className="line-clamp-1 font-semibold">{it.title}</h3>
                    <Badge tone={it.status === 'published' ? 'success' : it.status === 'scheduled' ? 'info' : 'neutral'}>
                      {it.status}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-slate-600">{it.body}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1 text-xs text-slate-500">
                      {it.hashtags?.map((h) => (
                        <span key={h} className="rounded-md bg-slate-100 px-2 py-0.5">{h}</span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {!autoMode && it.status === 'draft' && (
                        <button
                          onClick={() => { updateItem(it.id, { status: 'approved' }); addLog(`승인: ${it.title}`); }}
                          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                        >
                          승인
                        </button>
                      )}
                      {it.status === 'draft' && (
                        <button
                          onClick={() => schedulePublish(it)}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                        >
                          {autoMode ? '즉시 게시(시뮬)' : '예약 게시'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="lg:col-span-1">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h3 className="mb-2 font-semibold">채널 연결</h3>
            <ul className="space-y-2">
              {CHANNELS.map((ch) => (
                <li key={ch.key} className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: ch.color }}></span>
                    <span className="text-sm">{ch.name}</span>
                  </div>
                  <Toggle checked={connected[ch.key]} onChange={(v) => setConnected((s) => ({ ...s, [ch.key]: v }))} label={connected[ch.key] ? '연결' : '해제'} />
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
            <h3 className="mb-2 font-semibold">게시 큐</h3>
            {queue.length === 0 ? (
              <p className="text-sm text-slate-500">대기 중인 항목이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {queue.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                    <span className="line-clamp-1">{items.find((i) => i.id === r.itemId)?.title}</span>
                    <Badge tone={r.status === 'published' ? 'success' : 'info'}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
            <h3 className="mb-2 font-semibold">활동 로그</h3>
            <ol className="space-y-1 text-xs text-slate-600">
              {log.map((l, i) => (
                <li key={i} className="truncate">
                  <span className="text-slate-400">{new Date(l.time).toLocaleTimeString()}</span> · {l.msg}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      <footer className="border-t bg-white/70 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 text-xs text-slate-600">
          <span>CampOne 콘텐츠 자동화 데모</span>
          <span>© 2025 CampOne. All rights reserved.</span>
        </div>
      </footer>
    </main>
  );
}
