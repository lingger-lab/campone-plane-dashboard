import { useQuery } from '@tanstack/react-query';

export interface QuickButton {
  id: string;
  label: string;
  url: string;
  icon: string | null;
  category: 'primary' | 'video' | 'blog' | 'default';
  order: number;
  isActive: boolean;
}

interface QuickButtonsResponse {
  buttons: QuickButton[];
}

async function fetchQuickButtons(): Promise<QuickButtonsResponse> {
  const res = await fetch('/api/quick-buttons');
  if (!res.ok) {
    throw new Error('Failed to fetch quick buttons');
  }
  return res.json();
}

export function useQuickButtons() {
  return useQuery({
    queryKey: ['quickButtons'],
    queryFn: fetchQuickButtons,
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: false,
  });
}
