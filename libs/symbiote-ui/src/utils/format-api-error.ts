/**
 * Formate les erreurs API pour affichage (sans dépendance Host).
 */

export function formatApiError(error: unknown): string {
  if (error instanceof Error) {
    const apiError = error as Error & { status?: number; data?: unknown };
    if (apiError.status === 400) {
      const d = apiError.data as { errors?: unknown } | undefined;
      return d?.errors
        ? `Erreur de validation: ${JSON.stringify(d.errors)}`
        : apiError.message || 'Erreur de validation';
    }
    if (apiError.status === 401) return 'Non autorisé.';
    if (apiError.status === 403) return 'Accès refusé.';
    if (apiError.status === 404) return 'Ressource non trouvée.';
    if (apiError.status === 429) return 'Trop de requêtes. Réessayez plus tard.';
    if (apiError.status === 503) {
      const msg = (
        (apiError.data as { message?: string; error?: string })?.message ??
        (apiError.data as { message?: string; error?: string })?.error ??
        apiError.message ??
        ''
      ).toString().trim();
      if (/cortex|ai-cortex|AI Service Unavailable/i.test(msg)) {
        return 'Service IA (Cortex) indisponible. Vérifiez ai-cortex et AI_MODE.';
      }
      return msg || 'Service temporairement indisponible.';
    }
    if (apiError.status != null && apiError.status >= 500) {
      return apiError.message?.trim() || 'Erreur serveur. Réessayez plus tard.';
    }
    return apiError.message || 'Une erreur est survenue';
  }
  return 'Une erreur inconnue est survenue';
}
