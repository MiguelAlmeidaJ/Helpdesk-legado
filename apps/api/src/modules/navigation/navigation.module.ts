import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { NavigationService } from './application/navigation.service';
import { NavigationController } from './presentation/http/navigation.controller';

@Module({
  imports: [AccessModule],
  controllers: [NavigationController],
  providers: [NavigationService],
})
export class NavigationModule {}
