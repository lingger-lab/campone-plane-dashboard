/**
 * CampOne 관리자 대시보드 - MSW 브라우저 설정
 *
 * 브라우저 환경에서 MSW 초기화
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

/**
 * MSW 시작
 * 개발 환경에서만 실행
 */
export async function startMSW() {
  if (process.env.NODE_ENV === 'development') {
    return worker.start({
      onUnhandledRequest: 'bypass', // 처리되지 않은 요청은 통과
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
  }
  return Promise.resolve();
}
