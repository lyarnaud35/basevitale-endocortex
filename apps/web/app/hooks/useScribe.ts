import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../stores/useAuthStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Hook personnalisé pour le Module S (Scribe) avec TanStack Query
 * 
 * Version BaseVitale V112
 */
export function useExtractKnowledgeGraph() {
  const { token } = useAuthStore();

  return useMutation({
    mutationFn: async (data: { text: string; patientId?: string }) => {
      const response = await fetch(`${API_URL}/scribe/extract-graph`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : 'Bearer test-token',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to extract knowledge graph');
      }

      const result = await response.json();
      return result.data || result;
    },
  });
}

export function useTranscribeAndExtract() {
  const { token } = useAuthStore();

  return useMutation({
    mutationFn: async (data: {
      text: string;
      patientId: string;
      consultationDate?: string;
    }) => {
      const response = await fetch(`${API_URL}/scribe/transcribe-and-extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : 'Bearer test-token',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to transcribe and extract');
      }

      const result = await response.json();
      return result.data || result;
    },
  });
}
