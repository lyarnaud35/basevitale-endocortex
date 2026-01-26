import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsInsTokenValidator } from '../validators/ins-token.validator';

/**
 * Decorator pour valider qu'une propriété est un token INS valide
 * 
 * @param validationOptions - Options de validation
 * 
 * @example
 * class CreatePatientDto {
 *   @IsInsToken()
 *   insToken: string;
 * }
 */
export function IsInsToken(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsInsTokenValidator,
    });
  };
}
