import {
  type ArgumentsHost,
  type ExceptionFilter,
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorPayload } from './api-error.js';
import { CommonCodes } from './codes.js';

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return typeof (value as ApiErrorPayload).code === 'string';
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let body: ApiErrorPayload;

    if (typeof exceptionResponse === 'string') {
      body = {
        statusCode: status,
        code: CommonCodes.unknown,
        message: exceptionResponse,
        error: HttpStatus[status] ?? 'Error',
      };
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const obj = exceptionResponse as Record<string, unknown>;

      if (isApiErrorPayload(exceptionResponse)) {
        body = {
          ...exceptionResponse,
          statusCode: status,
        };
      } else if (typeof obj.message === 'object' && obj.message !== null && isApiErrorPayload(obj.message)) {
        body = {
          ...(obj.message as ApiErrorPayload),
          statusCode: status,
        };
      } else {
        const message = obj.message;
        let messageText: string | undefined;

        if (typeof message === 'string') {
          messageText = message;
        } else if (Array.isArray(message)) {
          messageText = message.filter((part): part is string => typeof part === 'string').join(' ');
        }

        body = {
          statusCode: status,
          code: CommonCodes.unknown,
          message: messageText,
          error: typeof obj.error === 'string' ? obj.error : HttpStatus[status] ?? 'Error',
        };
      }
    } else {
      body = {
        statusCode: status,
        code: CommonCodes.unknown,
        message: String(exceptionResponse),
      };
    }

    response.status(status).json(body);
  }
}