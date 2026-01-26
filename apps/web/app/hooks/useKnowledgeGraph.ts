import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/useAuthStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Hook personnalisé pour le Knowledge Graph avec TanStack Query
 * 
 * Version BaseVitale V112
 */
export function useKnowledgeGraph(consultationId?: string) {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['knowledge-graph', 'consultations', consultationId, 'graph'],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/knowledge-graph/consultations/${consultationId}/graph`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : 'Bearer test-token',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch knowledge graph');
      }

      const data = await response.json();
      return data.data || data;
    },
    enabled: !!consultationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function usePatientKnowledgeGraph(patientId?: string) {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['knowledge-graph', 'patients', patientId],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/knowledge-graph/patients/${patientId}/nodes`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : 'Bearer test-token',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch patient knowledge graph');
      }

      const data = await response.json();
      return data.data || data;
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
