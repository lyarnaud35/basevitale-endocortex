import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface Patient {
  id: string;
  insToken: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  email?: string;
  phone?: string;
  address?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    country: string;
  };
}

export interface SearchPatientParams {
  firstName?: string;
  lastName?: string;
  insToken?: string;
  birthDate?: string;
  page?: number;
  limit?: number;
}

export function usePatients(searchParams?: SearchPatientParams) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['patients', 'search', searchParams],
    queryFn: () =>
      apiClient.get<{ data: Patient[]; pagination: any }>(
        `/identity/search?${new URLSearchParams(
          Object.entries(searchParams || {}).reduce((acc, [key, value]) => {
            if (value) acc[key] = String(value);
            return acc;
          }, {} as Record<string, string>),
        )}`,
      ),
    enabled: !!searchParams && Object.keys(searchParams).length > 0,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Patient, 'id'>) =>
      apiClient.post<{ data: Patient }>('/identity/patients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  return {
    patients: query.data?.data || [],
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createPatient: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => apiClient.get<{ data: Patient }>(`/identity/patients/${id}`),
    enabled: !!id,
  });
}
