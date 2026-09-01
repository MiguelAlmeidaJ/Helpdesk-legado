import { Module } from '@nestjs/common';
import { LegacyPhpSessionRepository } from './infrastructure/legacy-php-session.repository';
import { AccessController } from './presentation/http/access.controller';
import { LegacySessionGuard } from './presentation/http/legacy-session.guard';
import { PermissionsGuard } from './presentation/http/permissions.guard';

@Module({
  controllers: [AccessController],
  providers: [
    LegacyPhpSessionRepository,
    LegacySessionGuard,
    PermissionsGuard,
  ],
  exports: [LegacySessionGuard, PermissionsGuard],
})
export class AccessModule {}
