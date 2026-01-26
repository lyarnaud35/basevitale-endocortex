import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator pour parser un paramètre en entier
 * 
 * @example
 * @Get(':id')
 * async getById(@ParseInt() id: number) {
 *   return this.service.getById(id);
 * }
 */
export const ParseInt = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest();
    const param = request.params[data as string] || request.query[data as string];
    return parseInt(param, 10);
  },
);
