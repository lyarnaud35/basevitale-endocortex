import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/useAuthStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Hook personnalisé pour les appels API avec TanStack Query
 * 
 * Version BaseVitale V112
 */
export function useApi<T>(
  endpoint: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
  },
) {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: [endpoint],
    queryFn: async () => {
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : 'Bearer test-token',
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || data as T;
    },
    enabled: options?.enabled !== false,
    refetchInterval: options?.refetchInterval,
    staleTime: options?.staleTime,
  });
}

/**
 * Hook pour les mutations API
 */
export function useApiMutation<TData, TVariables>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
) {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : 'Bearer test-token',
        },
        body: JSON.stringify(variables),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `API Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || data as TData;
    },
    onSuccess: () => {
      // Invalider les caches pertinents
      queryClient.invalidateQueries({ queryKey: [endpoint.split('/')[1]] });
    },
  });
}
