import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { PassportModule } from '@nestjs/passport';
import { MailModule } from '../mail/mail.module.js';
import { UsersModule } from '../users/users.module.js';
import { ErasureModule } from '../erasure/erasure.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { DefaultRolePermissionsSeed } from './default-role-permissions.seed.js';
import { JwtStrategy } from './jwt.strategy.js';
import { PermissionsService } from './permissions.service.js';

@Module({
  imports: [
    UsersModule,
    ErasureModule,
    MailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '8h') as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PermissionsService, DefaultRolePermissionsSeed],
  exports: [AuthService, JwtModule, PermissionsService],
})
export class AuthModule {}
