import { ValidationPipe, type INestApplication } from '@nestjs/common';

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
    }),
  );
}
