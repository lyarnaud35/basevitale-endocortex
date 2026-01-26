'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

/**
 * Providers pour l'application Next.js
 * 
 * Inclut TanStack Query pour le state management avancé
 * Version BaseVitale V112
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache pendant 5 minutes par défaut
            staleTime: 5 * 60 * 1000,
            // Garder en cache pendant 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry automatique
            retry: 2,
            // Refetch sur window focus (désactivé pour éviter trop de requêtes)
            refetchOnWindowFocus: false,
          },
          mutations: {
            // Retry automatique pour les mutations
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Devtools uniquement en développement */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
