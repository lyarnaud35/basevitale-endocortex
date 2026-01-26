import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/useAuthStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Hook personnalisé pour la facturation avec TanStack Query
 * 
 * Version BaseVitale V112
 */
export function useBillingEvents(consultationId?: string) {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['billing', 'events', consultationId],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/billing/consultations/${consultationId}/events`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : 'Bearer test-token',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch billing events');
      }

      const data = await response.json();
      return data.data || data;
    },
    enabled: !!consultationId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useBillingEvent(eventId: string) {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ['billing', 'events', eventId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/billing/events/${eventId}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : 'Bearer test-token',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch billing event');
      }

      const data = await response.json();
      return data.data || data;
    },
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCreateBillingEvent() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: any) => {
      const response = await fetch(`${API_URL}/billing/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : 'Bearer test-token',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create billing event');
      }

      const data = await response.json();
      return data.data || data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'events'] });
    },
  });
}

export function useValidateBillingEvent() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const response = await fetch(`${API_URL}/billing/events/${eventId}/validate`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : 'Bearer test-token',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to validate billing event');
      }

      const data = await response.json();
      return data.data || data;
    },
    onSuccess: (data, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'events', eventId] });
      queryClient.invalidateQueries({ queryKey: ['billing', 'events'] });
    },
  });
}

export function useTransmitBillingEvent() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const response = await fetch(`${API_URL}/billing/events/${eventId}/transmit`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : 'Bearer test-token',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to transmit billing event');
      }

      const data = await response.json();
      return data.data || data;
    },
    onSuccess: (data, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'events', eventId] });
      queryClient.invalidateQueries({ queryKey: ['billing', 'events'] });
    },
  });
}
