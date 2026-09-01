import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { CurrentUserResponse } from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import { AuthenticateWithPassword } from '../../application/authenticate-with-password';
import type { AuthenticatedUser } from '../../domain/authenticated-user';
import { ApiSessionRepository } from '../../infrastructure/api-session.repository';
import { CurrentUser } from './current-user.decorator';
import { readCookie } from './cookie';
import { LegacySessionGuard } from './legacy-session.guard';

interface CookieResponse {
  cookie(
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      maxAge: number;
      path: string;
      sameSite: 'lax';
      secure: boolean;
    },
  ): void;
  clearCookie(
    name: string,
    options: {
      httpOnly: boolean;
      path: string;
      sameSite: 'lax';
      secure: boolean;
    },
  ): void;
}

function currentUserResponse(user: AuthenticatedUser): CurrentUserResponse {
  return {
    id: user.id,
    name: user.name,
    login: user.login,
    functionId: user.functionId,
    accessSource: user.accessSource,
    roleAssignments: [...user.roleAssignments],
    grants: [...user.grants],
  };
}

function stringField(
  body: unknown,
  field: 'login' | 'password',
  maxLength: number,
): string {
  if (!body || typeof body !== 'object') {
    throw new BadRequestException('Corpo da requisição inválido.');
  }

  const value = (body as Record<string, unknown>)[field];

  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} é obrigatório.`);
  }

  const normalized = field === 'login' ? value.trim() : value;

  if (normalized.length < 1 || normalized.length > maxLength) {
    throw new BadRequestException(`${field} possui tamanho inválido.`);
  }

  return normalized;
}

@ApiTags('auth')
@Controller('auth')
export class AccessController {
  constructor(
    private readonly authenticate: AuthenticateWithPassword,
    private readonly apiSessions: ApiSessionRepository,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Entrar no Helpdesk',
    description:
      'Valida as mesmas credenciais bcrypt usadas pelo PHP e cria uma sessão opaca em api_sessions.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['login', 'password'],
      properties: {
        login: { type: 'string', example: 'usuario' },
        password: { type: 'string', format: 'password' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Sessão criada e usuário autenticado.',
  })
  @ApiResponse({
    status: 400,
    description: 'Corpo de login inválido.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário ou senha inválidos.',
  })
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<CurrentUserResponse> {
    const login = stringField(body, 'login', 100);
    const password = stringField(body, 'password', 200);

    const authenticated = await this.authenticate.execute(login, password);

    if (!authenticated) {
      throw new UnauthorizedException('Usuário ou senha inválidos.');
    }

    const cookieName =
      this.config.get<string>('API_SESSION_COOKIE')?.trim() ||
      'HELPDESK_SESSION';
    const secure =
      this.config.get<string>('SESSION_COOKIE_SECURE')?.trim().toLowerCase() ===
      'true';

    response.cookie(cookieName, authenticated.token, {
      httpOnly: true,
      maxAge: Math.max(
        0,
        authenticated.expiresAt.getTime() - Date.now(),
      ),
      path: '/',
      sameSite: 'lax',
      secure,
    });

    return currentUserResponse(authenticated.user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Encerrar sessão',
    description:
      'Revoga a sessão nativa quando presente e remove também o cookie PHP legado do navegador.',
  })
  @ApiResponse({ status: 204, description: 'Sessão encerrada.' })
  async logout(
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<void> {
    const nativeCookie =
      this.config.get<string>('API_SESSION_COOKIE')?.trim() ||
      'HELPDESK_SESSION';
    const legacyCookie =
      this.config.get<string>('LEGACY_SESSION_COOKIE')?.trim() || 'PHPSESSID';
    const nativeToken = readCookie(cookieHeader, nativeCookie);
    const secure =
      this.config.get<string>('SESSION_COOKIE_SECURE')?.trim().toLowerCase() ===
      'true';

    if (nativeToken) {
      await this.apiSessions.revoke(nativeToken, 'logout');
    }

    const options = {
      httpOnly: true,
      path: '/',
      sameSite: 'lax' as const,
      secure,
    };

    response.clearCookie(nativeCookie, options);
    response.clearCookie(legacyCookie, options);
  }

  @Get('me')
  @UseGuards(LegacySessionGuard)
  @ApiSecurity(LEGACY_SESSION_SECURITY)
  @ApiOperation({
    summary: 'Obter usuário autenticado',
    description:
      'Aceita a sessão nativa da API e, durante a transição, também a sessão PHP legada.',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuário autenticado e suas permissões efetivas.',
  })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, inválida, expirada ou usuário inativo.',
  })
  me(@CurrentUser() user: AuthenticatedUser | undefined): CurrentUserResponse {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    return currentUserResponse(user);
  }
}
