import { Module } from '@nestjs/common';
import { AuthenticateWithPassword } from './application/authenticate-with-password';
import { ResolveAuthenticatedUser } from './application/resolve-authenticated-user';
import { AccessIdentityRepository } from './infrastructure/access-identity.repository';
import { ApiSessionRepository } from './infrastructure/api-session.repository';
import { LegacyPhpSessionRepository } from './infrastructure/legacy-php-session.repository';
import { RbacAccessRepository } from './infrastructure/rbac-access.repository';
import { AccessController } from './presentation/http/access.controller';
import { LegacySessionGuard } from './presentation/http/legacy-session.guard';
import { PermissionsGuard } from './presentation/http/permissions.guard';

const accessProviders = [
  AccessIdentityRepository,
  ApiSessionRepository,
  LegacyPhpSessionRepository,
  RbacAccessRepository,
  ResolveAuthenticatedUser,
  AuthenticateWithPassword,
  LegacySessionGuard,
  PermissionsGuard,
];

@Module({
  controllers: [AccessController],
  providers: accessProviders,
  // Guards referenced by controllers in another module are resolved in that
  // consumer context. Export their dependencies as well, not only the guards.
  exports: accessProviders,
})
export class AccessModule {}
