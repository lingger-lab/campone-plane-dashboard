'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { TenantConfig, TenantContextValue } from './types';

const TenantContext = createContext<TenantContextValue | null>(null);

interface TenantProviderProps {
  tenantId: string;
  config: TenantConfig;
  children: ReactNode;
}

/**
 * 테넌트 컨텍스트 프로바이더
 *
 * 서버 컴포넌트에서 테넌트 설정을 로드한 후
 * 클라이언트 컴포넌트에 전달합니다.
 */
export function TenantProvider({ tenantId, config, children }: TenantProviderProps) {
  return (
    <TenantContext.Provider
      value={{
        tenantId,
        config,
        isLoading: false,
        error: null,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

/**
 * 현재 테넌트 정보를 가져오는 훅
 *
 * @throws TenantProvider 외부에서 호출 시 에러
 */
export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }

  return context;
}

/**
 * 테넌트 정보를 안전하게 가져오는 훅 (null 반환 가능)
 */
export function useTenantSafe(): TenantContextValue | null {
  return useContext(TenantContext);
}

export { TenantContext };
