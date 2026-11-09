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
    .addTag(
      'Batteries',
      'Battery inventory. **GET /batteries/serial/:serial** resolves a pack by barcode before **POST /swaps/assign**.',
    )
    .addTag('Bikes')
    .addTag('Owners', 'Fleet buyers — wallet, bikes, and riders')
    .addTag('Cards', 'NFC cards')
    .addTag('Roles')
    .addTag('Stations')
    .addTag(
      'Swaps',
      'Swap transactions and station assignment workflow (**POST /swaps/assign**, complete steps). Confirm incoming packs with **GET /batteries/serial/:serial** first.',
    )
    .addTag('Users')
    .addTag('Wallets')
    .addTag('Company accounts', 'Company bank accounts (assets) for float collection')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });
}
