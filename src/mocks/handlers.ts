/**
 * CampOne 관리자 대시보드 - MSW 핸들러
 *
 * Mock Service Worker를 사용한 API 모킹
 */

import { http, HttpResponse, delay } from 'msw';

// Mock 데이터 임포트
import contacts from './data/contacts.json';
import segments from './data/segments.json';
import messages from './data/messages.json';
import events from './data/events.json';
import donations from './data/donations.json';
import tasks from './data/tasks.json';
import assets from './data/assets.json';
import trends from './data/trends.json';
import trendsConfig from './data/trends.config.json';
import channelLinks from './data/channelLinks.json';
import alerts from './data/alerts.json';
import audit from './data/audit.json';

const API_BASE = '/api/v1';

// 응답 지연 시뮬레이션 (개발 환경에서 로딩 상태 테스트용)
const DELAY_MS = 200;

export const handlers = [
  // ============================================
  // Contacts
  // ============================================
  http.get(`${API_BASE}/contacts`, async () => {
    await delay(DELAY_MS);
    return HttpResponse.json({
      items: contacts,
      total: contacts.length,
    });
  }),

  http.get(`${API_BASE}/contacts/:id`, async ({ params }) => {
    await delay(DELAY_MS);
    const contact = contacts.find((c) => c.id === params.id);
    if (!contact) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: '연락처를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    return HttpResponse.json(contact);
  }),

  http.post(`${API_BASE}/contacts`, async ({ request }) => {
    await delay(DELAY_MS);
    const body = (await request.json()) as Record<string, unknown>;
    const newContact = {
      id: `c${String(contacts.length + 1).padStart(3, '0')}`,
      ...body,
      createdAt: new Date().toISOString(),
    };
    return HttpResponse.json(newContact, { status: 201 });
  }),

  http.put(`${API_BASE}/contacts/:id`, async ({ params, request }) => {
    await delay(DELAY_MS);
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: params.id, ...body });
  }),

  http.delete(`${API_BASE}/contacts/:id`, async () => {
    await delay(DELAY_MS);
    return HttpResponse.json({ success: true });
  }),

  // ============================================
  // Segments
  // ============================================
  http.get(`${API_BASE}/segments`, async () => {
    await delay(DELAY_MS);
    return HttpResponse.json({
      items: segments,
      total: segments.length,
    });
  }),

  http.get(`${API_BASE}/segments/:id`, async ({ params }) => {
    await delay(DELAY_MS);
    const segment = segments.find((s) => s.id === params.id);
    if (!segment) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: '세그먼트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    return HttpResponse.json(segment);
  }),

  http.post(`${API_BASE}/segments`, async ({ request }) => {
    await delay(DELAY_MS);
    const body = (await request.json()) as Record<string, unknown>;
    const newSegment = {
      id: `s${String(segments.length + 1).padStart(3, '0')}`,
      ...body,
      size: Math.floor(Math.random() * 1000) + 100,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(newSegment, { status: 201 });
  }),

  http.post(`${API_BASE}/segments/:id/build`, async ({ params }) => {
    await delay(DELAY_MS * 2);
    return HttpResponse.json({
      jobId: `job_${params.id}_${Date.now()}`,
      status: 'processing',
    });
  }),

  // ============================================
  // Messages
  // ============================================
  http.get(`${API_BASE}/messages`, async () => {
    await delay(DELAY_MS);
    return HttpResponse.json({
      items: messages,
      total: messages.length,
    });
  }),

  http.get(`${API_BASE}/messages/:id`, async ({ params }) => {
    await delay(DELAY_MS);
    const message = messages.find((m) => m.id === params.id);
    if (!message) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: '메시지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    return HttpResponse.json(message);
  }),

  http.get(`${API_BASE}/messages/:id/metrics`, async ({ params }) => {
    await delay(DELAY_MS);
    const message = messages.find((m) => m.id === params.id);
    if (!message) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: '메시지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    return HttpResponse.json({
      id: params.id,
      metrics: message.metrics,
      updatedAt: new Date().toISOString(),
    });
  }),

  http.post(`${API_BASE}/messages/preview`, async ({ request }) => {
    await delay(DELAY_MS);
    const body = (await request.json()) as { body: string; variables: Record<string, string> };
    let rendered = body.body;

    // 변수 치환
    Object.entries(body.variables || {}).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return HttpResponse.json({ rendered });
  }),

  http.post(`${API_BASE}/messages/send`, async ({ request }) => {
    await delay(DELAY_MS * 3);
    const body = (await request.json()) as { campaignId: string };
    return HttpResponse.json({
      jobId: `send_${Date.now()}`,
      campaignId: body.campaignId,
      status: 'queued',
    });
  }),

  // ============================================
  // Events
  // ============================================
  http.get(`${API_BASE}/events`, async () => {
    await delay(DELAY_MS);
    return HttpResponse.json({
      items: events,
      total: events.length,
    });
  }),

  http.get(`${API_BASE}/events/:id`, async ({ params }) => {
    await delay(DELAY_MS);
    const event = events.find((e) => e.id === params.id);
    if (!event) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: '이벤트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    return HttpResponse.json(event);
  }),

  http.post(`${API_BASE}/events`, async ({ request }) => {
    await delay(DELAY_MS);
    const body = (await request.json()) as Record<string, unknown>;
    const newEvent = {
      id: `e${String(events.length + 1).padStart(3, '0')}`,
      ...body,
    };
    return HttpResponse.json(newEvent, { status: 201 });
  }),

  // ============================================
  // Donations
  // ============================================
  http.get(`${API_BASE}/donations`, async () => {
    await delay(DELAY_MS);
    return HttpResponse.json({
      items: donations,
      total: donations.length,
    });
  }),

  http.get(`${API_BASE}/donations/stats`, async () => {
    await delay(DELAY_MS);
    const total = donations.reduce((sum, d) => sum + d.amount, 0);

    // 일별 합계 계산
    const dailyMap = new Map<string, number>();
    donations.forEach((d) => {
      const date = d.createdAt.split('T')[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + d.amount);
    });

    const daily = Array.from(dailyMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return HttpResponse.json({ total, daily });
  }),

  // ============================================
  // Tasks
  // ============================================
  http.get(`${API_BASE}/tasks`, async () => {
    await delay(DELAY_MS);
    return HttpResponse.json({
      items: tasks,
      total: tasks.length,
    });
  }),

  http.get(`${API_BASE}/tasks/:id`, async ({ params }) => {
    await delay(DELAY_MS);
    const task = tasks.find((t) => t.id === params.id);
    if (!task) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: '태스크를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    return HttpResponse.json(task);
  }),

  http.patch(`${API_BASE}/tasks/:id`, async ({ params, request }) => {
    await delay(DELAY_MS);
    const body = (await request.json()) as Record<string, unknown>;
    const task = tasks.find((t) => t.id === params.id);
    return HttpResponse.json({ ...task, ...body });
  }),

  // ============================================
  // Assets
  // ============================================
  http.get(`${API_BASE}/assets`, async () => {
    await delay(DELAY_MS);
    return HttpResponse.json({
      items: assets,
      total: assets.length,
    });
  }),

  // ============================================
  // Trends (여론 지수)
  // ============================================
  http.get(`${API_BASE}/trends`, async () => {
    await delay(DELAY_MS);
    return HttpResponse.json({
      items: trends,
      baseline: { google: 55, naver: 60, sns: 1200 },
      weights: trendsConfig.weights,
    });
  }),

  http.get(`${API_BASE}/trends/index`, async () => {
    await delay(DELAY_MS);
    const { gt, nv, sns } = trendsConfig.weights;

    const indexData = trends.map((t) => {
      // SNS 정규화 (0-100)
      const snsNorm =
        t.snsMentions > 0
          ? 50 + ((t.snsPos - t.snsNeg) / t.snsMentions) * 50
          : 50;

      const index = gt * t.google + nv * t.naver + sns * Math.min(100, snsNorm);

      return {
        date: t.date,
        index: +index.toFixed(1),
        gt_norm: t.google,
        nv_norm: t.naver,
        sns_norm: +snsNorm.toFixed(1),
        sentiment: t.snsPos - t.snsNeg,
      };
    });

    // WoW 계산
    const lastWeek = indexData.slice(-7);
    const prevWeek = indexData.slice(-14, -7);
    const currentAvg = lastWeek.reduce((s, d) => s + d.index, 0) / lastWeek.length;
    const prevAvg =
      prevWeek.length > 0
        ? prevWeek.reduce((s, d) => s + d.index, 0) / prevWeek.length
        : currentAvg;
    const wow = prevAvg > 0 ? ((currentAvg - prevAvg) / prevAvg) * 100 : 0;

    return HttpResponse.json({
      items: indexData,
      wow: +wow.toFixed(1),
    });
  }),

  http.get(`${API_BASE}/trends/alerts`, async () => {
    await delay(DELAY_MS);
    return HttpResponse.json({
      spikes: [
        { date: '2025-01-04', source: 'google', keyword: '홍길동 후보', rate: 0.23 },
        { date: '2025-01-07', source: 'sns', keyword: '타운홀', rate: 0.28 },
      ],
      topKeywords: ['홍길동', '타운홀', '청년정책', '출정식', '경제공약'],
    });
  }),

  http.post(`${API_BASE}/trends/import`, async () => {
    await delay(DELAY_MS * 2);
    return HttpResponse.json({
      imported: 10,
      ignored: 2,
    });
  }),

  // ============================================
  // Channels
  // ============================================
  http.get(`${API_BASE}/channels`, async () => {
    await delay(DELAY_MS);
    return HttpResponse.json({
      items: Object.values(channelLinks),
    });
  }),

  http.put(`${API_BASE}/channels/:key`, async ({ params, request }) => {
    await delay(DELAY_MS);
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      key: params.key,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  // ============================================
  // Banners
  // ============================================
  http.get(`${API_BASE}/banners/presets`, async () => {
    await delay(DELAY_MS);
    return HttpResponse.json({
      items: [
        { id: 'bp001', name: '가로형 대', size: { w: 3600, h: 900 }, dpi: 300, bleed: 20, safeArea: 20 },
        { id: 'bp002', name: '가로형 중', size: { w: 4000, h: 700 }, dpi: 300, bleed: 20, safeArea: 20 },
        { id: 'bp003', name: '가로형 광폭', size: { w: 5000, h: 900 }, dpi: 300, bleed: 20, safeArea: 20 },
        { id: 'bp004', name: '가로형 초광폭', size: { w: 7000, h: 900 }, dpi: 300, bleed: 20, safeArea: 20 },
        { id: 'bp005', name: '세로형', size: { w: 600, h: 1800 }, dpi: 300, bleed: 20, safeArea: 20 },
      ],
    });
  }),

  http.post(`${API_BASE}/banners/render`, async ({ request }) => {
    await delay(DELAY_MS * 3);
    const body = (await request.json()) as { presetId: string };
    return HttpResponse.json({
      fileUrl: `/generated/banner_${body.presetId}_${Date.now()}.pdf`,
      previewUrl: `/generated/banner_${body.presetId}_${Date.now()}_preview.png`,
    });
  }),

  // ============================================
  // Alerts
  // ============================================
  http.get(`${API_BASE}/alerts`, async () => {
    await delay(DELAY_MS);
    const unread = alerts.filter((a) => !a.read).length;
    return HttpResponse.json({
      items: alerts,
      unread,
    });
  }),

  http.patch(`${API_BASE}/alerts/:id/read`, async ({ params }) => {
    await delay(DELAY_MS);
    return HttpResponse.json({
      id: params.id,
      read: true,
    });
  }),

  // ============================================
  // Audit Log
  // ============================================
  http.get(`${API_BASE}/audit`, async () => {
    await delay(DELAY_MS);
    return HttpResponse.json({
      items: audit,
      total: audit.length,
    });
  }),

  // ============================================
  // Dashboard KPIs
  // ============================================
  http.get(`${API_BASE}/dashboard/kpis`, async () => {
    await delay(DELAY_MS);

    const activeContacts = contacts.filter((c) => c.optIn).length;
    const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);
    const completedTasks = tasks.filter((t) => t.status === 'done').length;
    const scheduledEvents = events.filter((e) => ['planning', 'scheduled'].includes(e.status)).length;

    // 최근 트렌드 지수
    const latestTrend = trends[trends.length - 1];
    const { gt, nv, sns } = trendsConfig.weights;
    const snsNorm = 50 + ((latestTrend.snsPos - latestTrend.snsNeg) / latestTrend.snsMentions) * 50;
    const trendIndex = gt * latestTrend.google + nv * latestTrend.naver + sns * Math.min(100, snsNorm);

    return HttpResponse.json({
      activeContacts: {
        value: activeContacts * 150, // 데모용 스케일업
        change: 5.2,
        status: 'success',
      },
      messageSent: {
        value: 2680,
        openRate: 45.0,
        change: 12.3,
        status: 'success',
      },
      contentPublished: {
        value: 24,
        change: -8.5,
        status: 'warning',
      },
      eventsScheduled: {
        value: scheduledEvents,
        attendeeTarget: events.reduce((sum, e) => sum + e.attendeeTarget, 0),
        status: 'success',
      },
      donationsTotal: {
        value: totalDonations,
        change: 15.8,
        status: 'success',
      },
      tasksCompleted: {
        value: completedTasks,
        total: tasks.length,
        status: completedTasks / tasks.length > 0.7 ? 'success' : 'warning',
      },
      trendIndex: {
        value: +trendIndex.toFixed(1),
        change: 8.5,
        status: 'success',
      },
    });
  }),
];
