import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { UserManagement } from './application/user-management';
import { UsersRepository } from './infrastructure/users.repository';
import { UsersController } from './presentation/http/users.controller';

@Module({
  imports: [AccessModule],
  controllers: [UsersController],
  providers: [UsersRepository, UserManagement],
})
export class UsersModule {}
