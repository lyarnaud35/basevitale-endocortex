import { SetMetadata } from '@nestjs/common';

export const TIMEOUT_MS_KEY = 'timeoutMs';

/**
 * Décorateur pour définir un timeout personnalisé (en ms) sur une route.
 * Priorité : méthode > classe. Si absent, le timeout par défaut (ex. 30s) s'applique.
 *
 * @example
 * @Post('analyze')
 * @Timeout(90000)
 * async analyze() { ... }
 */
export const Timeout = (ms: number) => SetMetadata(TIMEOUT_MS_KEY, ms);
