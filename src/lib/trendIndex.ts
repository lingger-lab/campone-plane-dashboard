/**
 * CampOne 관리자 대시보드 - 여론 트렌드 지수 계산
 *
 * 합성 지수 계산: GT 30% / NT 30% / SNS 40%
 */

import type { TrendData, TrendWeights, TrendIndex } from './types';

// 기본 가중치 설정
export const defaultWeights: TrendWeights = {
  gt: 0.3,  // Google Trends
  nv: 0.3,  // Naver
  sns: 0.4, // SNS
};

/**
 * 값을 0-100 범위로 클램핑
 */
export const clamp01 = (x: number): number => Math.max(0, Math.min(100, x));

/**
 * SNS 데이터에서 정규화된 값 계산 (0-100)
 * mentions, positive, negative를 기반으로 계산
 */
export function normalizeSNS(mentions: number, positive: number, negative: number): number {
  if (mentions === 0) return 50;

  // 감성 비율 계산 (-1 ~ 1)
  const sentimentRatio = (positive - negative) / mentions;

  // 0-100 스케일로 변환
  const normalized = 50 + sentimentRatio * 50;

  return clamp01(normalized);
}

/**
 * 감성 지수 계산 (-100 ~ 100)
 */
export function calcSentiment(positive: number, negative: number): number {
  const total = positive + negative;
  if (total === 0) return 0;

  return Math.round(((positive - negative) / total) * 100);
}

/**
 * 합성 트렌드 지수 계산
 * @param gt - Google Trends 값 (0-100)
 * @param nv - Naver 값 (0-100)
 * @param sns - SNS 정규화 값 (0-100)
 * @param w - 가중치 설정
 * @returns 합성 지수 (0-100, 소수점 1자리)
 */
export function calcTrendIndex(
  gt: number,
  nv: number,
  sns: number,
  w: TrendWeights = defaultWeights
): number {
  const index = w.gt * clamp01(gt) + w.nv * clamp01(nv) + w.sns * clamp01(sns);
  return +index.toFixed(1);
}

/**
 * TrendData 배열에서 TrendIndex 배열 생성
 */
export function processTrendData(
  data: TrendData[],
  weights: TrendWeights = defaultWeights
): TrendIndex[] {
  return data.map((d) => {
    const snsNorm = normalizeSNS(d.snsMentions, d.snsPos, d.snsNeg);

    return {
      date: d.date,
      index: calcTrendIndex(d.google, d.naver, snsNorm, weights),
      gt_norm: clamp01(d.google),
      nv_norm: clamp01(d.naver),
      sns_norm: snsNorm,
      sentiment: calcSentiment(d.snsPos, d.snsNeg),
    };
  });
}

/**
 * 주간 변화율 계산 (Week over Week)
 */
export function calcWoW(current: number, previous: number): number {
  if (previous === 0) return 0;
  return +((current - previous) / previous * 100).toFixed(1);
}

/**
 * 최근 N일 평균 계산
 */
export function calcMovingAverage(data: TrendIndex[], days: number = 7): number {
  if (data.length === 0) return 0;

  const recent = data.slice(-days);
  const sum = recent.reduce((acc, d) => acc + d.index, 0);

  return +(sum / recent.length).toFixed(1);
}

/**
 * 급증 감지 (전일 대비 특정 비율 이상 증가)
 */
export function detectSpike(
  data: TrendData[],
  threshold: number = 0.2 // 20% 증가
): { date: string; source: string; rate: number }[] {
  const spikes: { date: string; source: string; rate: number }[] = [];

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];

    // Google Trends 급증 확인
    if (prev.google > 0) {
      const gtRate = (curr.google - prev.google) / prev.google;
      if (gtRate >= threshold) {
        spikes.push({ date: curr.date, source: 'google', rate: gtRate });
      }
    }

    // Naver 급증 확인
    if (prev.naver > 0) {
      const nvRate = (curr.naver - prev.naver) / prev.naver;
      if (nvRate >= threshold) {
        spikes.push({ date: curr.date, source: 'naver', rate: nvRate });
      }
    }

    // SNS 급증 확인
    if (prev.snsMentions > 0) {
      const snsRate = (curr.snsMentions - prev.snsMentions) / prev.snsMentions;
      if (snsRate >= threshold) {
        spikes.push({ date: curr.date, source: 'sns', rate: snsRate });
      }
    }
  }

  return spikes;
}

/**
 * KPI 상태 색상 결정
 */
export function getTrendStatus(
  currentIndex: number,
  previousIndex: number
): 'success' | 'warning' | 'danger' {
  const change = currentIndex - previousIndex;

  if (change >= 10) return 'success';  // +10%p 이상
  if (change >= -5) return 'warning';  // -5%p ~ +10%p
  return 'danger';                      // -5%p 미만
}
