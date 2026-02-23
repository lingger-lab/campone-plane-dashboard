'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface HelpDocument {
  id: string;
  title: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface HelpDocumentsResponse {
  items: HelpDocument[];
  total: number;
}

async function fetchHelpDocuments(category?: string): Promise<HelpDocumentsResponse> {
  const params = category ? `?category=${encodeURIComponent(category)}` : '';
  const res = await fetch(`/api/help/documents${params}`);
  if (!res.ok) {
    throw new Error('Failed to fetch help documents');
  }
  return res.json();
}

export function useHelpDocuments(category?: string) {
  return useQuery({
    queryKey: ['helpDocuments', category],
    queryFn: () => fetchHelpDocuments(category),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadHelpDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/api/help/documents', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpDocuments'] });
    },
  });
}

export function useDeleteHelpDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/help/documents?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Delete failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpDocuments'] });
    },
  });
}
