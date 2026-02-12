import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface TenantPreferenceResponse {
  key: string;
  value: unknown;
}

async function fetchPreference(key: string): Promise<TenantPreferenceResponse> {
  const response = await fetch(`/api/tenant-preferences?key=${encodeURIComponent(key)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch tenant preference');
  }
  return response.json();
}

async function savePreference(params: { key: string; value: unknown }): Promise<TenantPreferenceResponse> {
  const response = await fetch('/api/tenant-preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error('Failed to save tenant preference');
  }
  return response.json();
}

/**
 * 테넌트 환경설정 조회 hook
 */
export function useTenantPreference<T = unknown>(key: string) {
  return useQuery({
    queryKey: ['tenant-preference', key],
    queryFn: () => fetchPreference(key),
    staleTime: 60_000,
    select: (data) => data.value as T | null,
  });
}

/**
 * 테넌트 환경설정 저장 hook
 */
export function useSaveTenantPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: savePreference,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-preference', variables.key] });
    },
  });
}
