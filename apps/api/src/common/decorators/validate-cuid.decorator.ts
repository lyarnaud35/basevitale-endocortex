import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsCuidValidator } from '../validators/cuid.validator';

/**
 * Decorator pour valider qu'une propriété est un CUID valide
 * 
 * @param validationOptions - Options de validation
 * 
 * @example
 * class MyDto {
 *   @IsCuid()
 *   id: string;
 * }
 */
export function IsCuid(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCuidValidator,
    });
  };
}
