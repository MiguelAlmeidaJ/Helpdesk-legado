import { Module } from '@nestjs/common';
import { ExpensesModule } from './expenses/expenses.module';
import { FinanceModule } from './finance/finance.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [ExpensesModule, FinanceModule, VehiclesModule],
})
export class LogisticsModule {}
