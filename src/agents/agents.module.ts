import { Module } from '@nestjs/common';
import { ReceiptsModule } from '../receipts/receipts.module.js';
import { AgentsController } from './agents.controller.js';
import { AgentsService } from './agents.service.js';

@Module({
  imports: [ReceiptsModule],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
