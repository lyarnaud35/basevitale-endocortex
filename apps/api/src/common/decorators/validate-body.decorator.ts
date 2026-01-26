import { applyDecorators, UsePipes, Body } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

/**
 * Decorator pour valider automatiquement le body avec un schéma Zod
 * 
 * @example
 * @Post()
 * @ValidateBody(CreatePatientSchema)
 * async create(@Body() data: CreatePatient) {
 *   // data est automatiquement validé
 * }
 */
export function ValidateBody(schema: ZodSchema): ParameterDecorator {
  return Body(new ZodValidationPipe(schema)) as ParameterDecorator;
}

/**
 * Decorator pour valider automatiquement les query params avec un schéma Zod
 * 
 * @example
 * @Get('search')
 * @ValidateQuery(SearchPatientSchema)
 * async search(@Query() criteria: SearchPatient) {
 *   // criteria est automatiquement validé
 * }
 */
export function ValidateQuery(schema: ZodSchema) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const query = args[0];
      const validated = schema.parse(query);
      return originalMethod.apply(this, [validated, ...args.slice(1)]);
    };
    return descriptor;
  };
}
