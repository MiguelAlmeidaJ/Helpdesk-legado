import { Module } from '@nestjs/common';
import { ResolveAuthenticatedUser } from './application/resolve-authenticated-user';
import { LegacyPhpSessionRepository } from './infrastructure/legacy-php-session.repository';
import { RbacAccessRepository } from './infrastructure/rbac-access.repository';
import { AccessController } from './presentation/http/access.controller';
import { LegacySessionGuard } from './presentation/http/legacy-session.guard';
import { PermissionsGuard } from './presentation/http/permissions.guard';

@Module({
  controllers: [AccessController],
  providers: [
    LegacyPhpSessionRepository,
    RbacAccessRepository,
    ResolveAuthenticatedUser,
    LegacySessionGuard,
    PermissionsGuard,
  ],
  exports: [LegacySessionGuard, PermissionsGuard],
})
export class AccessModule {}
