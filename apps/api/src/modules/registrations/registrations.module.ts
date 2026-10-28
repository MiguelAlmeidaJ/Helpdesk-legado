import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { CnpjLookupService } from './cnpj-lookup.service';

@Module({
  imports: [AccessModule],
  controllers: [RegistrationsController],
  providers: [RegistrationsService, CnpjLookupService],
})
export class RegistrationsModule {}
