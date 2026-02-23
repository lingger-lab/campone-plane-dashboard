export interface QualityGateConfig {
  top1Threshold: number;
  top3AvgThreshold: number;
}

const DEFAULT_CONFIG: QualityGateConfig = {
  top1Threshold: parseFloat(process.env.QUALITY_GATE_TOP1_THRESHOLD || '0.75'),
  top3AvgThreshold: parseFloat(process.env.QUALITY_GATE_TOP3AVG_THRESHOLD || '0.70'),
};

export function validateQuality(
  metrics: { top1: number; top3avg: number },
  config: QualityGateConfig = DEFAULT_CONFIG,
): { passed: boolean; reason?: string } {
  if (metrics.top1 < config.top1Threshold) {
    return {
      passed: false,
      reason: `최상위 문서 유사도(${metrics.top1.toFixed(2)})가 기준(${config.top1Threshold})에 미달`,
    };
  }

  if (metrics.top3avg < config.top3AvgThreshold) {
    return {
      passed: false,
      reason: `상위 3개 평균 유사도(${metrics.top3avg.toFixed(2)})가 기준(${config.top3AvgThreshold})에 미달`,
    };
  }

  return { passed: true };
}
