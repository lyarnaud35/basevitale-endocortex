import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Type,
} from '@nestjs/common';
import { ZodSchema, ZodError, z } from 'zod';

/**
 * ZodValidationPipe
 * 
 * Pipe de validation personnalisé utilisant Zod
 * 
 * Utilisation:
 * @Post()
 * async create(@Body(ZodValidationPipe(CreatePatientSchema)) data: CreatePatient) {
 *   // data est validé et typé
 * }
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));

        throw new BadRequestException({
          message: 'Validation failed',
          errors: errorMessages,
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}

/**
 * Factory function pour créer un ZodValidationPipe
 */
export function createZodValidationPipe<T>(schema: ZodSchema<T>) {
  return new ZodValidationPipe(schema);
}
