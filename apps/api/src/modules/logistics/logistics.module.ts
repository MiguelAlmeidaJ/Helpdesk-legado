import { Module } from '@nestjs/common';
import { ExpensesModule } from './expenses/expenses.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [ExpensesModule, VehiclesModule],
})
export class LogisticsModule {}
