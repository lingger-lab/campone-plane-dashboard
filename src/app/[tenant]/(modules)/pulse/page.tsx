'use client';

import { EmbedIframe } from '@/components/modules/EmbedIframe';

export default function InsightsPage() {
  return (
    <EmbedIframe
      title="Insights"
      subtitle="여론 분석 · 트렌드 모니터링"
      serviceKey="insights"
    />
  );
}
