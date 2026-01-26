import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator pour récupérer l'ID de requête
 * 
 * @example
 * @Get()
 * async getData(@RequestId() requestId: string) {
 *   this.logger.log(`Request ID: ${requestId}`);
 * }
 */
export const RequestId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.requestId || 'unknown';
  },
);
