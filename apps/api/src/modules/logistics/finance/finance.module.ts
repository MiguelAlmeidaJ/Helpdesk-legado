import { Module } from '@nestjs/common';
import { AccessModule } from '../../access/access.module';
import { FinanceService } from './application/finance.service';
import { FinanceController } from './presentation/http/finance.controller';

@Module({
  imports: [AccessModule],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
