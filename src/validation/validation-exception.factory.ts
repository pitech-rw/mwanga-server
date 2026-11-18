import type { ValidationError } from 'class-validator';
import { apiBadRequest } from '../errors/api-error.js';
import { ValidationCodes } from '../errors/codes.js';

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

const constraintPriority = [
  'isNotEmpty',
  'isDefined',
  'isEmail',
  'isIn',
  'isInt',
  'isBoolean',
  'isEnum',
  'minLength',
  'maxLength',
  'isString',
  'isNumber',
  'min',
  'max',
  'whitelistValidation',
  'forbidNonWhitelisted',
] as const;

function flattenValidationErrors(errors: ValidationError[], parentPath = ''): ValidationError[] {
  const flattened: ValidationError[] = [];

  for (const error of errors) {
    const propertyPath = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints && Object.keys(error.constraints).length > 0) {
      flattened.push({
        ...error,
        property: propertyPath,
      });
    }

    if (error.children?.length) {
      flattened.push(...flattenValidationErrors(error.children, propertyPath));
    }
  }

  return flattened;
}

export function pickValidationRule(error: ValidationError): string {
  const { value, constraints } = error;

  if (!constraints || Object.keys(constraints).length === 0) {
    return 'invalid';
  }

  if (isMissing(value)) {
    return 'required';
  }

  for (const key of constraintPriority) {
    if (constraints[key]) {
      if (key === 'isNotEmpty' || key === 'isDefined') {
        return 'required';
      }
      return key;
    }
  }

  return 'invalid';
}

export function validationExceptionFactory(errors: ValidationError[]) {
  const flat = flattenValidationErrors(errors);
  const issues = flat.map((error) => ({
    field: error.property,
    rule: pickValidationRule(error),
  }));

  return apiBadRequest(ValidationCodes.failed, { errors: issues });
}