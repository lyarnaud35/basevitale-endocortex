import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/useAuthStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Hook personnalisé pour les patients avec TanStack Query
 * 
 * Version BaseVitale V112
 */
export function usePatients(searchCriteria?: {
  firstName?: string;
  lastName?: string;
  insToken?: string;
}) {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['patients', 'search', searchCriteria],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchCriteria?.firstName) params.append('firstName', searchCriteria.firstName);
      if (searchCriteria?.lastName) params.append('lastName', searchCriteria.lastName);
      if (searchCriteria?.insToken) params.append('insToken', searchCriteria.insToken);

      const response = await fetch(`${API_URL}/identity/search?${params}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : 'Bearer test-token',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }

      const data = await response.json();
      return data.data || data;
    },
    enabled: !!searchCriteria && (!!searchCriteria.firstName || !!searchCriteria.lastName || !!searchCriteria.insToken),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function usePatient(patientId: string) {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['patients', patientId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/identity/patients/${patientId}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : 'Bearer test-token',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch patient');
      }

      const data = await response.json();
      return data.data || data;
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreatePatient() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientData: any) => {
      const response = await fetch(`${API_URL}/identity/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : 'Bearer test-token',
        },
        body: JSON.stringify(patientData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create patient');
      }

      const data = await response.json();
      return data.data || data;
    },
    onSuccess: () => {
      // Invalider les requêtes de recherche
      queryClient.invalidateQueries({ queryKey: ['patients', 'search'] });
    },
  });
}
