import { describe, expect, it } from 'vitest';
import type { ValidationError } from 'class-validator';
import { formatValidationErrorMessage } from './validation-exception.factory.js';

describe('formatValidationErrorMessage', () => {
  it('reports required when value is missing', () => {
    const error: ValidationError = {
      property: 'identifier',
      value: undefined,
      constraints: {
        maxLength: 'identifier must be shorter than or equal to 255 characters',
      },
    };

    expect(formatValidationErrorMessage(error)).toBe('identifier is required');
  });

  it('reports required for empty string', () => {
    const error: ValidationError = {
      property: 'password',
      value: '',
      constraints: {
        minLength: 'password must be longer than or equal to 8 characters',
      },
    };

    expect(formatValidationErrorMessage(error)).toBe('password is required');
  });

  it('prefers minLength over maxLength when value is present', () => {
    const error: ValidationError = {
      property: 'password',
      value: 'short',
      constraints: {
        maxLength: 'password must be shorter than or equal to 128 characters',
        minLength: 'password must be longer than or equal to 8 characters',
      },
    };

    expect(formatValidationErrorMessage(error)).toBe(
      'password must be longer than or equal to 8 characters',
    );
  });
});
