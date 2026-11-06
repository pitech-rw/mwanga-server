import { type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Mwanga API')
    .setDescription('Battery swap and fleet management REST API')
    .setVersion('0.0.1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Obtain a token from POST /auth/login',
      },
      'JWT-auth',
    )
    .addTag('App', 'Root and health checks')
    .addTag('Auth', 'Sign in and session')
    .addTag('Batteries')
    .addTag('Bikes')
    .addTag('Cards', 'NFC cards')
    .addTag('Roles')
    .addTag('Stations')
    .addTag(
      'Swaps',
      'Swap transactions and assignment workflow. **GET /swaps/lookup** (or **POST /swaps/lookup**) confirms the incoming battery serial against the bike before **POST /swaps/assign**.',
    )
    .addTag('Users')
    .addTag('Wallets')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });
}
