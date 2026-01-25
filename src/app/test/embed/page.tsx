'use client';

import React, { useState } from 'react';
import { ExternalLink, Maximize2, Minimize2, RefreshCw } from 'lucide-react';

// Cloud Run 서비스 URL
const SERVICES = {
  insights: {
    name: 'Insights (여론분석)',
    url: 'https://campone-v2-frontend-2qbgm2n2oq-du.a.run.app',
  },
  civicHub: {
    name: 'Civic Hub (시민소통)',
    url: 'https://campone-civic-hub-2qbgm2n2oq-du.a.run.app',
  },
  policy: {
    name: 'Policy Lab (정책)',
    url: 'https://campone-policy-2qbgm2n2oq-du.a.run.app',
  },
};

type ServiceKey = keyof typeof SERVICES;

export default function EmbedTestPage() {
  const [activeService, setActiveService] = useState<ServiceKey>('insights');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);

  const currentService = SERVICES[activeService];

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
    setIsLoading(true);
  };

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'min-h-screen p-4'}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div>
          <h1 className="text-xl font-bold">모듈 임베드 테스트</h1>
          <p className="text-sm text-gray-500">
            Cloud Run 서비스를 iframe으로 임베드 테스트
          </p>
        </div>
        {!isFullscreen && (
          <a
            href="/pulse"
            className="text-sm text-blue-600 hover:underline"
          >
            ← 대시보드로 돌아가기
          </a>
        )}
      </div>

      {/* 서비스 선택 탭 */}
      <div className="flex gap-2 mb-4">
        {(Object.entries(SERVICES) as [ServiceKey, typeof SERVICES[ServiceKey]][]).map(
          ([key, service]) => (
            <button
              key={key}
              onClick={() => {
                setActiveService(key);
                setIsLoading(true);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeService === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {service.name}
            </button>
          )
        )}
      </div>

      {/* 툴바 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 rounded-t-lg border border-b-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{currentService.name}</span>
          <span className="text-xs text-gray-500 truncate max-w-xs">{currentService.url}</span>
          {isLoading && (
            <span className="text-xs text-blue-600 animate-pulse">로딩 중...</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-gray-200 rounded"
            title="새로고침"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => window.open(currentService.url, '_blank')}
            className="p-2 hover:bg-gray-200 rounded"
            title="새 창으로 열기"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-gray-200 rounded"
            title={isFullscreen ? '축소' : '전체화면'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* iframe */}
      <div
        className="relative border rounded-b-lg overflow-hidden bg-white"
        style={{ height: isFullscreen ? 'calc(100vh - 120px)' : 'calc(100vh - 200px)' }}
      >
        {/* 로딩 오버레이 */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              <span className="text-sm text-gray-500">{currentService.name} 로딩 중...</span>
            </div>
          </div>
        )}

        <iframe
          key={`${activeService}-${iframeKey}`}
          src={currentService.url}
          title={currentService.name}
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          allow="clipboard-write; clipboard-read"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
        />
      </div>

      {/* 정보 */}
      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
        <p className="font-medium text-yellow-800">테스트 안내</p>
        <ul className="mt-2 space-y-1 text-yellow-700">
          <li>• 이 페이지는 <code className="bg-yellow-100 px-1 rounded">/test/embed</code> 경로에서만 접근 가능합니다</li>
          <li>• 각 서비스는 별도의 인증 체계를 가지고 있어 로그인이 필요할 수 있습니다</li>
          <li>• 전체화면 모드에서 실제 사용 느낌을 테스트해보세요</li>
          <li>• 문제가 있으면 &quot;새 창으로 열기&quot;로 직접 접속해보세요</li>
        </ul>
      </div>
    </div>
  );
}
