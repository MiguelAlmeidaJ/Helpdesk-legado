import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { translateLegacySession } from '../../application/legacy-permission-translator';
import { LegacyPhpSessionRepository } from '../../infrastructure/legacy-php-session.repository';
import type { AuthenticatedRequest } from './authenticated-request';
import { readCookie } from './cookie';

@Injectable()
export class LegacySessionGuard implements CanActivate {
  constructor(
    private readonly sessions: LegacyPhpSessionRepository,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookieName =
      this.config.get<string>('LEGACY_SESSION_COOKIE')?.trim() || 'PHPSESSID';

    const sessionId = readCookie(request.headers.cookie, cookieName);

    if (!sessionId) {
      throw new UnauthorizedException('Sessão não encontrada.');
    }

    const legacySession = await this.sessions.findBySessionId(sessionId);

    if (!legacySession) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }

    request.user = translateLegacySession(legacySession);

    return true;
  }
}
