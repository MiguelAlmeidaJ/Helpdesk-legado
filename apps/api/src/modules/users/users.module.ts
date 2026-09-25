import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { UserManagement } from './application/user-management';
import { UserFunctionManagement } from './application/user-function-management';
import { UsersRepository } from './infrastructure/users.repository';
import { UserFunctionsRepository } from './infrastructure/user-functions.repository';
import { UsersController } from './presentation/http/users.controller';
import { UserFunctionsController } from './presentation/http/user-functions.controller';

@Module({
  imports: [AccessModule],
  controllers: [UsersController, UserFunctionsController],
  providers: [UsersRepository, UserManagement, UserFunctionsRepository, UserFunctionManagement],
})
export class UsersModule {}
