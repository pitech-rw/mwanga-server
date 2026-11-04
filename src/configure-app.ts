import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { configureSwagger } from './configure-swagger.js';

export function configureApp(app: INestApplication) {
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
    }),
  );
  configureSwagger(app);
}
