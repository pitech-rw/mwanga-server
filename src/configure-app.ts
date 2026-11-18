import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { configureSwagger } from './configure-swagger.js';
import { HttpExceptionFilter } from './errors/http-exception.filter.js';
import { validationExceptionFactory } from './validation/validation-exception.factory.js';

export function configureApp(app: INestApplication) {
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  configureSwagger(app);
}
