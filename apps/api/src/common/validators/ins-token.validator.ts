import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Validator pour vérifier qu'un token INS est valide
 * 
 * Format INS français : 13 chiffres
 */
@ValidatorConstraint({ name: 'isInsToken', async: false })
export class IsInsTokenValidator implements ValidatorConstraintInterface {
  private readonly insRegex = /^\d{13}$/;

  validate(value: any, args: ValidationArguments) {
    if (typeof value !== 'string') {
      return false;
    }
    return this.insRegex.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid INS token (13 digits)`;
  }
}
