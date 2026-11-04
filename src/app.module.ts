import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { BatteriesModule } from './batteries/batteries.module.js';
import { BikesModule } from './bikes/bikes.module.js';
import { CardsModule } from './cards/cards.module.js';
import { OwnersModule } from './owners/owners.module.js';
import { PrismaModule } from './prisma.module.js';
import { RidersModule } from './riders/riders.module.js';
import { RolesModule } from './roles/roles.module.js';
import { StationsModule } from './stations/stations.module.js';
import { SwapsModule } from './swaps/swaps.module.js';
import { UsersModule } from './users/users.module.js';
import { WalletsModule } from './wallets/wallets.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    RolesModule,
    OwnersModule,
    RidersModule,
    CardsModule,
    BikesModule,
    StationsModule,
    BatteriesModule,
    WalletsModule,
    SwapsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
