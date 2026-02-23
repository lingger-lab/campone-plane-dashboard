'use client';

import { EmbedIframe } from '@/components/modules/EmbedIframe';

export default function OpsPage() {
  return (
    <EmbedIframe
      title="Ops"
      subtitle="캠프 운영 · 체크리스트"
      serviceKey="ops"
    />
  );
}
