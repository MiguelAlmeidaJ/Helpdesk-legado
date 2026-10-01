import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { CatalogImageStorageService } from './application/catalog-image-storage.service';
import { CatalogService } from './application/catalog.service';
import { CatalogRepository } from './application/ports/catalog.repository';
import { PrismaCatalogRepository } from './infrastructure/prisma-catalog.repository';
import { CatalogController } from './presentation/http/catalog.controller';

@Module({
  imports: [AccessModule],
  controllers: [CatalogController],
  providers: [
    CatalogService,
    CatalogImageStorageService,
    {
      provide: CatalogRepository,
      useClass: PrismaCatalogRepository,
    },
  ],
})
export class CatalogModule {}
