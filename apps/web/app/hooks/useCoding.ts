import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../stores/useAuthStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Hook personnalisé pour le codage avec TanStack Query
 * 
 * Version BaseVitale V112
 */
export function useCodingSuggestions(consultationId?: string) {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['coding', 'suggestions', consultationId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/coding/consultations/${consultationId}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : 'Bearer test-token',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch coding suggestions');
      }

      const data = await response.json();
      return data.data || data;
    },
    enabled: !!consultationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSuggestCodes() {
  const { token } = useAuthStore();

  return useMutation({
    mutationFn: async (request: { text?: string; consultationId?: string; minConfidence?: number }) => {
      const response = await fetch(`${API_URL}/coding/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : 'Bearer test-token',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to suggest codes');
      }

      const data = await response.json();
      return data.data || data;
    },
  });
}
