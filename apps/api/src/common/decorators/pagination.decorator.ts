import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PaginationParams } from '../utils/pagination.util';

/**
 * Decorator pour récupérer les paramètres de pagination depuis la query
 * 
 * @example
 * @Get()
 * async getData(@Pagination() pagination: PaginationParams) {
 *   const { skip, take } = normalizePagination(pagination.page, pagination.limit);
 *   return this.service.findAll(skip, take);
 * }
 */
export const Pagination = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PaginationParams => {
    const request = ctx.switchToHttp().getRequest();
    const query = request.query;

    return {
      page: query.page ? parseInt(query.page, 10) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      skip: query.skip ? parseInt(query.skip, 10) : undefined,
    };
  },
);
