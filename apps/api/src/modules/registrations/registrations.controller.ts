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
  CategoryChildWriteInput,
  CategoryItemRecord,
  CategorySubcategoryRecord,
  CategoryTreeResponse,
  ClientContactRecord,
  ClientContactWriteInput,
  ClientLocationRecord,
  ClientLocationWriteInput,
  ClientRelationsResponse,
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

  @Get('clients/:clientId/relations')
  @ApiOperation({ summary: 'Lista contatos e locais de um cliente' })
  clientRelations(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('clientId') clientId: string,
  ): Promise<ClientRelationsResponse> {
    return this.registrations.clientRelations(
      authenticated(user),
      id(clientId),
    );
  }

  @Post('clients/:clientId/contacts')
  @ApiOperation({ summary: 'Cadastra contato de um cliente' })
  createClientContact(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('clientId') clientId: string,
    @Body() body: ClientContactWriteInput,
  ): Promise<ClientContactRecord> {
    return this.registrations.createClientContact(
      authenticated(user),
      id(clientId),
      body,
    );
  }

  @Patch('clients/:clientId/contacts/:contactId')
  @ApiOperation({ summary: 'Atualiza contato de um cliente' })
  updateClientContact(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('clientId') clientId: string,
    @Param('contactId') contactId: string,
    @Body() body: ClientContactWriteInput,
  ): Promise<ClientContactRecord> {
    return this.registrations.updateClientContact(
      authenticated(user),
      id(clientId),
      id(contactId),
      body,
    );
  }

  @Post('clients/:clientId/locations')
  @ApiOperation({ summary: 'Cadastra local de atendimento de um cliente' })
  createClientLocation(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('clientId') clientId: string,
    @Body() body: ClientLocationWriteInput,
  ): Promise<ClientLocationRecord> {
    return this.registrations.createClientLocation(
      authenticated(user),
      id(clientId),
      body,
    );
  }

  @Patch('clients/:clientId/locations/:locationId')
  @ApiOperation({ summary: 'Atualiza local de atendimento de um cliente' })
  updateClientLocation(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('clientId') clientId: string,
    @Param('locationId') locationId: string,
    @Body() body: ClientLocationWriteInput,
  ): Promise<ClientLocationRecord> {
    return this.registrations.updateClientLocation(
      authenticated(user),
      id(clientId),
      id(locationId),
      body,
    );
  }

  @Get('categories/:categoryId/tree')
  @ApiOperation({ summary: 'Lista subcategorias e itens de uma categoria' })
  categoryTree(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('categoryId') categoryId: string,
  ): Promise<CategoryTreeResponse> {
    return this.registrations.categoryTree(
      authenticated(user),
      id(categoryId),
    );
  }

  @Post('categories/:categoryId/subcategories')
  @ApiOperation({ summary: 'Cadastra subcategoria' })
  createSubcategory(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('categoryId') categoryId: string,
    @Body() body: CategoryChildWriteInput,
  ): Promise<CategorySubcategoryRecord> {
    return this.registrations.createSubcategory(
      authenticated(user),
      id(categoryId),
      body,
    ).then((row) => ({ ...row, items: [] }));
  }

  @Patch('categories/:categoryId/subcategories/:subcategoryId')
  @ApiOperation({ summary: 'Atualiza subcategoria' })
  updateSubcategory(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('categoryId') categoryId: string,
    @Param('subcategoryId') subcategoryId: string,
    @Body() body: CategoryChildWriteInput,
  ): Promise<CategorySubcategoryRecord> {
    return this.registrations.updateSubcategory(
      authenticated(user),
      id(categoryId),
      id(subcategoryId),
      body,
    ).then((row) => ({ ...row, items: [] }));
  }

  @Post('categories/:categoryId/subcategories/:subcategoryId/items')
  @ApiOperation({ summary: 'Cadastra item de subcategoria' })
  createItem(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('categoryId') categoryId: string,
    @Param('subcategoryId') subcategoryId: string,
    @Body() body: CategoryChildWriteInput,
  ): Promise<CategoryItemRecord> {
    return this.registrations.createItem(
      authenticated(user),
      id(categoryId),
      id(subcategoryId),
      body,
    );
  }

  @Patch('categories/:categoryId/subcategories/:subcategoryId/items/:itemId')
  @ApiOperation({ summary: 'Atualiza item de subcategoria' })
  updateItem(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('categoryId') categoryId: string,
    @Param('subcategoryId') subcategoryId: string,
    @Param('itemId') itemId: string,
    @Body() body: CategoryChildWriteInput,
  ): Promise<CategoryItemRecord> {
    return this.registrations.updateItem(
      authenticated(user),
      id(categoryId),
      id(subcategoryId),
      id(itemId),
      body,
    );
  }

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
    return this.registrations.update(
      authenticated(user),
      resource,
      id(rawId),
      body,
    );
  }
}
