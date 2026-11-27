import { Module } from '@nestjs/common';
import { ReceiptsService } from './receipts.service.js';

@Module({
  providers: [ReceiptsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}