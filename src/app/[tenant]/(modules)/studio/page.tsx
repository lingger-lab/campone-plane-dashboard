'use client';

import { EmbedIframe } from '@/components/modules/EmbedIframe';

export default function StudioPage() {
  return (
    <EmbedIframe
      title="Studio"
      subtitle="콘텐츠 제작 · 자동 배포"
      serviceKey="studio"
    />
  );
}
