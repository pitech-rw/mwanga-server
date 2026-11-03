import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { BatteriesModule } from './batteries/batteries.module.js';
import { BikesModule } from './bikes/bikes.module.js';
import { CardsModule } from './cards/cards.module.js';
import { OwnersModule } from './owners/owners.module.js';
import { PrismaService } from './prisma.service.js';
import { RidersModule } from './riders/riders.module.js';
import { StationsModule } from './stations/stations.module.js';
import { SwapsModule } from './swaps/swaps.module.js';
import { UsersModule } from './users/users.module.js';
import { WalletsModule } from './wallets/wallets.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UsersModule,
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
  providers: [AppService, PrismaService],
})
export class AppModule {}
