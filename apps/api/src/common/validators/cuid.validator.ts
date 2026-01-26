import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Validator pour vérifier qu'une chaîne est un CUID valide
 * 
 * Format CUID : c + 25 caractères alphanumériques
 */
@ValidatorConstraint({ name: 'isCuid', async: false })
export class IsCuidValidator implements ValidatorConstraintInterface {
  private readonly cuidRegex = /^c[a-z0-9]{25}$/;

  validate(value: any, args: ValidationArguments) {
    if (typeof value !== 'string') {
      return false;
    }
    return this.cuidRegex.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid CUID`;
  }
}
