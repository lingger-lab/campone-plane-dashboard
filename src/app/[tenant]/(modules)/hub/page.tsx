'use client';

import { EmbedIframe } from '@/components/modules/EmbedIframe';

export default function CivicHubPage() {
  return (
    <EmbedIframe
      title="Civic Hub"
      subtitle="시민 소통 · Q&A 관리"
      serviceKey="hub"
    />
  );
}
