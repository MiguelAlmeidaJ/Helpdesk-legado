import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  AppPermission,
  type TicketCatalogOption,
  type TicketClassificationCatalogsResponse,
  type UpdateTicketClassificationRequest,
} from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { GetTicketClassificationCatalogs } from '../../application/get-ticket-classification-catalogs';
import { UpdateTicketClassification } from '../../application/update-ticket-classification';

function positiveOrZero(value: string | undefined, field: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new BadRequestException(`${field} inválido.`);
  }
  return parsed;
}

@ApiTags('tickets')
@Controller('tickets')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class TicketClassificationController {
  constructor(
    private readonly catalogs: GetTicketClassificationCatalogs,
    private readonly updateClassification: UpdateTicketClassification,
  ) {}

  @Get('catalogs/classification')
  @RequirePermissions(AppPermission.TicketsRead)
  @ApiOperation({ summary: 'Catálogos da classificação do atendimento' })
  catalogsList(): Promise<TicketClassificationCatalogsResponse> {
    return this.catalogs.execute();
  }

  @Get('catalogs/classification/subcategories')
  @RequirePermissions(AppPermission.TicketsRead)
  @ApiOperation({ summary: 'Subcategorias ativas por categoria' })
  subcategories(
    @Query('categoryId') categoryId: string | undefined,
  ): Promise<TicketCatalogOption[]> {
    return this.catalogs.listSubcategories(
      positiveOrZero(categoryId, 'categoryId'),
    );
  }

  @Get('catalogs/classification/items')
  @RequirePermissions(AppPermission.TicketsRead)
  @ApiOperation({ summary: 'Itens ativos por subcategoria' })
  items(
    @Query('subcategoryId') subcategoryId: string | undefined,
  ): Promise<TicketCatalogOption[]> {
    return this.catalogs.listItems(
      positiveOrZero(subcategoryId, 'subcategoryId'),
    );
  }

  @Patch(':id/classification')
  @RequirePermissions(
    AppPermission.TicketsRead,
    AppPermission.TicketsClassify,
  )
  @ApiOperation({ summary: 'Editar classificação do atendimento' })
  async update(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseIntPipe) ticketId: number,
    @Body() body: UpdateTicketClassificationRequest,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }
    await this.updateClassification.execute(user, ticketId, body);
  }
}
