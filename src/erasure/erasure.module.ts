import { Module } from '@nestjs/common';
import { ErasureAdminController } from './erasure-admin.controller.js';
import { ErasureRequestService } from './erasure-request.service.js';
import { UserErasureService } from './user-erasure.service.js';

@Module({
  controllers: [ErasureAdminController],
  providers: [UserErasureService, ErasureRequestService],
  exports: [UserErasureService, ErasureRequestService],
})
export class ErasureModule {}