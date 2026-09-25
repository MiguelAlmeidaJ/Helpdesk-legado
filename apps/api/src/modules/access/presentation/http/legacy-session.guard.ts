import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResolveAuthenticatedUser } from '../../application/resolve-authenticated-user';
import { AccessIdentityRepository } from '../../infrastructure/access-identity.repository';
import { ApiSessionRepository } from '../../infrastructure/api-session.repository';
import { LegacyPhpSessionRepository } from '../../infrastructure/legacy-php-session.repository';
import type { AuthenticatedRequest } from './authenticated-request';
import { readCookie } from './cookie';

@Injectable()
export class LegacySessionGuard implements CanActivate {
  constructor(
    private readonly legacySessions: LegacyPhpSessionRepository,
    private readonly apiSessions: ApiSessionRepository,
    private readonly identities: AccessIdentityRepository,
    private readonly resolveUser: ResolveAuthenticatedUser,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookieHeader = request.headers.cookie;

    const nativeCookie =
      this.config.get<string>('API_SESSION_COOKIE')?.trim() ||
      'HELPDESK_SESSION';
    const nativeToken = readCookie(cookieHeader, nativeCookie);

    if (nativeToken) {
      const userId = await this.apiSessions.findActiveUserId(nativeToken);

      if (userId !== null) {
        const identity = await this.identities.findActiveById(userId);

        if (identity) {
          const user = await this.resolveUser.execute(identity.session);

          if (user) {
            request.user = user;
            return true;
          }
        }
      }
    }

    const legacyCookie =
      this.config.get<string>('LEGACY_SESSION_COOKIE')?.trim() || 'PHPSESSID';
    const legacySessionId = readCookie(cookieHeader, legacyCookie);

    if (legacySessionId) {
      const legacySession =
        await this.legacySessions.findBySessionId(legacySessionId);

      if (legacySession) {
        const user = await this.resolveUser.execute(legacySession);

        if (user) {
          request.user = user;
          return true;
        }
      }
    }

    throw new UnauthorizedException('Sessão inválida ou expirada.');
  }
}
