import { SetMetadata } from '@nestjs/common';

/**
 * Clé de métadonnées pour les routes publiques
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator pour marquer une route comme publique (sans authentification)
 * 
 * @example
 * @Get('health')
 * @Public()
 * async health() {
 *   return { status: 'ok' };
 * }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
