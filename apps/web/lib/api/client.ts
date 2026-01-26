const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/** Base URL de l'API (inclut le préfixe /api) */
export const API_BASE = `${API_URL}/api`;

export const apiClient = {
  get: async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('basevitale-auth') 
        ? JSON.parse(localStorage.getItem('basevitale-auth') || '{}').state?.token
        : null
      : null;

    const response = await fetch(`${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
      ...options,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Une erreur est survenue' }));
      const errorMessage = error.message || error.error || `HTTP ${response.status}`;
      
      // Créer une erreur enrichie avec les détails de la réponse
      const apiError = new Error(errorMessage);
      (apiError as any).status = response.status;
      (apiError as any).data = error;
      throw apiError;
    }

    return response.json();
  },

  post: async <T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('basevitale-auth')
        ? JSON.parse(localStorage.getItem('basevitale-auth') || '{}').state?.token
        : null
      : null;

    const response = await fetch(`${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Une erreur est survenue' }));
      const errorMessage = error.message || error.error || `HTTP ${response.status}`;
      
      const apiError = new Error(errorMessage);
      (apiError as any).status = response.status;
      (apiError as any).data = error;
      throw apiError;
    }

    return response.json();
  },

  put: async <T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('basevitale-auth')
        ? JSON.parse(localStorage.getItem('basevitale-auth') || '{}').state?.token
        : null
      : null;

    const response = await fetch(`${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Une erreur est survenue' }));
      const errorMessage = error.message || error.error || `HTTP ${response.status}`;
      const apiError = new Error(errorMessage);
      (apiError as any).status = response.status;
      (apiError as any).data = error;
      throw apiError;
    }

    return response.json();
  },

  delete: async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('basevitale-auth')
        ? JSON.parse(localStorage.getItem('basevitale-auth') || '{}').state?.token
        : null
      : null;

    const response = await fetch(`${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
      ...options,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Une erreur est survenue' }));
      const errorMessage = error.message || error.error || `HTTP ${response.status}`;
      
      const apiError = new Error(errorMessage);
      (apiError as any).status = response.status;
      (apiError as any).data = error;
      throw apiError;
    }

    return response.json();
  },
};

/**
 * Helper pour formater les erreurs API
 */
export function formatApiError(error: unknown): string {
  if (error instanceof Error) {
    const apiError = error as any;
    if (apiError.status === 400) {
      return apiError.data?.errors 
        ? `Erreur de validation: ${JSON.stringify(apiError.data.errors)}`
        : apiError.message || 'Erreur de validation';
    }
    if (apiError.status === 401) {
      return 'Non autorisé. Veuillez vous connecter.';
    }
    if (apiError.status === 403) {
      return 'Accès refusé.';
    }
    if (apiError.status === 404) {
      return 'Ressource non trouvée.';
    }
    if (apiError.status === 429) {
      return 'Trop de requêtes. Veuillez réessayer plus tard.';
    }
    if (apiError.status === 503) {
      const msg = (
        apiError.data?.message ??
        apiError.data?.error ??
        apiError.message ??
        '',
      ).toString();
      if (msg.includes('AI Service Unavailable') || msg.toLowerCase().includes('unavailable')) {
        return 'Service IA (Cortex) indisponible. En mode LOCAL, vérifiez que le container ai-cortex tourne et AI_MODE=LOCAL. En mode MOCK, cette erreur ne devrait pas apparaître.';
      }
      return msg || 'Service temporairement indisponible. Veuillez réessayer plus tard.';
    }
    if (apiError.status >= 500) {
      return 'Erreur serveur. Veuillez réessayer plus tard.';
    }
    return error.message || 'Une erreur est survenue';
  }
  return 'Une erreur inconnue est survenue';
}
