import { HttpException, HttpStatus } from '@nestjs/common';

export type ApiErrorParams = Record<string, string | number>;

export type ValidationIssue = {
  field: string;
  rule: string;
};

export type ApiErrorPayload = {
  statusCode: number;
  code: string;
  params?: ApiErrorParams;
  message?: string;
  errors?: ValidationIssue[];
  error?: string;
};

export type ApiSuccessPayload = {
  code: string;
  params?: ApiErrorParams;
};

export function apiError(
  code: string,
  options?: {
    params?: ApiErrorParams;
    message?: string;
    status?: HttpStatus;
    errors?: ValidationIssue[];
  },
): never {
  const status = options?.status ?? HttpStatus.BAD_REQUEST;
  const payload: ApiErrorPayload = {
    statusCode: status,
    code,
    ...(options?.params ? { params: options.params } : {}),
    ...(options?.message ? { message: options.message } : {}),
    ...(options?.errors ? { errors: options.errors } : {}),
  };
  throw new HttpException(payload, status);
}

export function apiBadRequest(
  code: string,
  options?: Omit<NonNullable<Parameters<typeof apiError>[1]>, 'status'>,
): never {
  return apiError(code, { ...options, status: HttpStatus.BAD_REQUEST });
}