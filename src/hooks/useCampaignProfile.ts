import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface CareerItem {
  icon: string;
  text: string;
}

export interface CampaignProfile {
  id: string;
  candidateName: string;
  candidateTitle: string;
  orgName: string;
  photoUrl: string | null;
  careers: CareerItem[];
  slogans: string[];
}

interface ProfileResponse {
  profile: CampaignProfile;
}

// 캠페인 프로필 조회
export function useCampaignProfile() {
  return useQuery<ProfileResponse>({
    queryKey: ['campaign-profile'],
    queryFn: async () => {
      const response = await fetch('/api/campaign-profile');
      if (!response.ok) {
        throw new Error('Failed to fetch campaign profile');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시
  });
}

// 캠페인 프로필 업데이트
export function useUpdateCampaignProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: Partial<CampaignProfile>) => {
      const response = await fetch('/api/campaign-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-profile'] });
    },
  });
}
