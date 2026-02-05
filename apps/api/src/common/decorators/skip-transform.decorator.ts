import { SetMetadata } from '@nestjs/common';

export const SKIP_TRANSFORM_KEY = 'skipTransform';

/**
 * Décorateur pour ne pas envelopper la réponse dans le format standard { success, data, timestamp }.
 * À utiliser pour les réponses brutes (SSE, fichiers, etc.).
 */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);
