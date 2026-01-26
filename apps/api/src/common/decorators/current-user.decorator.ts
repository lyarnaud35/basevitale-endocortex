import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentUser Decorator
 * 
 * Extrait l'utilisateur actuel depuis la requête
 * 
 * @example
 * @Get('profile')
 * async getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

/**
 * CurrentUserId Decorator
 * 
 * Extrait uniquement l'ID de l'utilisateur actuel
 * 
 * @example
 * @Post('patients')
 * async createPatient(@CurrentUserId() userId: string) {
 *   // userId contient l'ID de l'utilisateur
 * }
 */
export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id || 'system'; // Fallback à 'system' si pas d'auth
  },
);
