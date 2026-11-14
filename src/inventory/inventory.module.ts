import { Module } from '@nestjs/common';
import { BatteriesModule } from '../batteries/batteries.module.js';
import { BikesModule } from '../bikes/bikes.module.js';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';

@Module({
  imports: [BikesModule, BatteriesModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}