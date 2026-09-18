import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { NavigationAdminService } from './application/navigation-admin.service';
import { NavigationService } from './application/navigation.service';
import { NavigationAdminController } from './presentation/http/navigation-admin.controller';
import { NavigationController } from './presentation/http/navigation.controller';

@Module({
  imports: [AccessModule],
  controllers: [NavigationController, NavigationAdminController],
  providers: [NavigationService, NavigationAdminService],
})
export class NavigationModule {}
