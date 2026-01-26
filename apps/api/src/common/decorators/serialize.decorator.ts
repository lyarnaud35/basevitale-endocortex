import { UseInterceptors } from '@nestjs/common';
import { SerializeInterceptor } from '../interceptors/serialize.interceptor';

/**
 * Decorator pour sérialiser les réponses
 * 
 * Exclut automatiquement les propriétés sensibles
 * 
 * @example
 * @Serialize()
 * @Get()
 * async getUsers() {
 *   return this.service.findAll();
 * }
 */
export const Serialize = () => UseInterceptors(SerializeInterceptor);
