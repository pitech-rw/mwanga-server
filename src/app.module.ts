import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { PermissionsGuard } from './auth/permissions.guard.js';
import { BatteriesModule } from './batteries/batteries.module.js';
import { BikesModule } from './bikes/bikes.module.js';
import { OwnersModule } from './owners/owners.module.js';
import { AgentsModule } from './agents/agents.module.js';
import { CardsModule } from './cards/cards.module.js';
import { PrismaModule } from './prisma.module.js';
import { RolesModule } from './roles/roles.module.js';
import { StationsModule } from './stations/stations.module.js';
import { SwapsModule } from './swaps/swaps.module.js';
import { UsersModule } from './users/users.module.js';
import { ViolationsModule } from './violations/violations.module.js';
import { WalletsModule } from './wallets/wallets.module.js';
import { LedgerModule } from './ledger/ledger.module.js';
import { CompanyAccountsModule } from './company-accounts/company-accounts.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    LedgerModule,
    AuthModule,
    UsersModule,
    RolesModule,
    CardsModule,
    BikesModule,
    OwnersModule,
    AgentsModule,
    StationsModule,
    BatteriesModule,
    WalletsModule,
    CompanyAccountsModule,
    SwapsModule,
    ViolationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PermissionsGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
