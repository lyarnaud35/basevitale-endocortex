/**
 * Configuration du widget Scribe (Symbiote Protocol).
 * L'Host fournit apiBaseUrl et getToken ; on ne gère jamais l'auth nous‑mêmes.
 */

export interface ScribeConfig {
  /** Base URL de l'API (ex. http://localhost:3000/api) */
  apiBaseUrl: string;
  /** Token JWT ou API Key fourni par l'Host. Optionnel ; défaut "Bearer test-token" en sandbox. */
  getToken?: () => string | null;
}

/** API NestJS (Scribe). En dev : API sur 3001, Web sur 3000. Définir NEXT_PUBLIC_API_URL si autre. */
export const DEFAULT_API_BASE = 'http://localhost:3001/api';

export function resolveToken(getToken?: () => string | null): string {
  const t = getToken?.() ?? null;
  return t ? `Bearer ${t}` : 'Bearer test-token';
}
