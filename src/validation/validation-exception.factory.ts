import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

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

export function formatValidationErrorMessage(error: ValidationError): string {
  const { property, value, constraints } = error;

  if (!constraints || Object.keys(constraints).length === 0) {
    return `${property} is invalid`;
  }

  if (isMissing(value)) {
    return `${property} is required`;
  }

  for (const key of constraintPriority) {
    const message = constraints[key];
    if (message) {
      return message;
    }
  }

  return Object.values(constraints)[0] ?? `${property} is invalid`;
}

export function validationExceptionFactory(errors: ValidationError[]) {
  const messages = flattenValidationErrors(errors).map(formatValidationErrorMessage);

  return new BadRequestException(messages.length === 1 ? messages[0] : messages);
}
