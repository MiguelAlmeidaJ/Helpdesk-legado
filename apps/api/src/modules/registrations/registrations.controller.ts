import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type {
  RegistrationListResponse,
  RegistrationRecord,
  RegistrationWriteInput,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../access/domain/authenticated-user';
import { CurrentUser } from '../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../access/presentation/http/legacy-session.guard';
import { RegistrationsService } from './registrations.service';

function authenticated(user: AuthenticatedUser | undefined): AuthenticatedUser {
  if (!user) throw new UnauthorizedException('Usuário não autenticado.');
  return user;
}

function id(value: string): number {
  if (!/^\d+$/.test(value)) throw new BadRequestException('id é inválido.');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new BadRequestException('id é inválido.');
  }
  return parsed;
}

@ApiTags('registrations')
@Controller('registrations')
@UseGuards(LegacySessionGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class RegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Get(':resource')
  @ApiOperation({ summary: 'Lista registros de um cadastro migrado' })
  list(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('resource') resource: string,
    @Query('search') search?: string,
  ): Promise<RegistrationListResponse> {
    return this.registrations.list(authenticated(user), resource, search);
  }

  @Post(':resource')
  @ApiOperation({ summary: 'Cria registro em um cadastro migrado' })
  create(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('resource') resource: string,
    @Body() body: RegistrationWriteInput,
  ): Promise<RegistrationRecord> {
    return this.registrations.create(authenticated(user), resource, body);
  }

  @Patch(':resource/:id')
  @ApiOperation({ summary: 'Atualiza registro em um cadastro migrado' })
  update(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('resource') resource: string,
    @Param('id') rawId: string,
    @Body() body: RegistrationWriteInput,
  ): Promise<RegistrationRecord> {
    return this.registrations.update(authenticated(user), resource, id(rawId), body);
  }
}
