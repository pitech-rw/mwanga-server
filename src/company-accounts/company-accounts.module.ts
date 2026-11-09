import { Module } from '@nestjs/common';
import { CompanyAccountsController } from './company-accounts.controller.js';
import { CompanyAccountsService } from './company-accounts.service.js';

@Module({
  controllers: [CompanyAccountsController],
  providers: [CompanyAccountsService],
  exports: [CompanyAccountsService],
})
export class CompanyAccountsModule {}
