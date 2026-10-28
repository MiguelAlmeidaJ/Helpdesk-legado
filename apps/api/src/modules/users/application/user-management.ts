import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateManagedUserRequest,
  ManagedUserDetail,
  ManagedUserListResponse,
  UpdateManagedUserRequest,
  UserManagementCatalogs,
} from '@helpdesk/contracts';
import bcrypt from 'bcryptjs';
import { ApiSessionRepository } from '../../access/infrastructure/api-session.repository';
import { UsersRepository } from '../infrastructure/users.repository';

@Injectable()
export class UserManagement {
  constructor(
    private readonly users: UsersRepository,
    private readonly sessions: ApiSessionRepository,
  ) {}

  list(
    page: number,
    limit: number,
    search: string,
    statusFilter?: 1 | 2,
    functionId?: number,
  ): Promise<ManagedUserListResponse> {
    return this.users.list(page, limit, search, statusFilter, functionId);
  }

  async detail(id: number): Promise<ManagedUserDetail> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  catalogs(includePermissions: boolean): Promise<UserManagementCatalogs> {
    return this.users.catalogs(includePermissions);
  }

  async create(
    input: CreateManagedUserRequest,
    actorId: number,
    canSetExtras: boolean,
  ): Promise<ManagedUserDetail> {
    if (!canSetExtras && input.extraPermissionIds !== undefined) {
      throw new ForbiddenException('Sem permissão para definir permissões extras.');
    }
    await this.ensureUnique(input.login, input.email);
    if (input.extraPermissionIds && !(await this.users.permissionsExist(input.extraPermissionIds))) {
      throw new NotFoundException('Uma ou mais permissões extras não existem.');
    }
    const passwordHash = await bcrypt.hash(input.password, 12);
    const id = await this.users.create(
      input,
      passwordHash,
      actorId,
      canSetExtras,
    );
    return this.detail(id);
  }

  async update(
    id: number,
    actorId: number,
    input: UpdateManagedUserRequest,
    canSetExtras: boolean,
  ): Promise<ManagedUserDetail> {
    if (input.status === 2 && (id === 1 || id === actorId)) {
      throw new ForbiddenException('O usuário administrador principal e a própria conta não podem ser desativados.');
    }
    if (!canSetExtras && input.extraPermissionIds !== undefined) {
      throw new ForbiddenException('Sem permissão para alterar permissões extras.');
    }
    await this.ensureUnique(input.login, input.email, id);
    if (input.extraPermissionIds && !(await this.users.permissionsExist(input.extraPermissionIds))) {
      throw new NotFoundException('Uma ou mais permissões extras não existem.');
    }
    if (!(await this.users.update(
      id,
      input,
      canSetExtras,
      actorId,
    ))) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    if (input.status === 2) {
      await this.sessions.revokeAllForUser(id, 'user_deactivated');
    }
    return this.detail(id);
  }

  async deactivate(id: number, actorId: number): Promise<void> {
    if (id === 1 || id === actorId) {
      throw new ForbiddenException('O usuário administrador principal e a própria conta não podem ser desativados.');
    }
    if (!(await this.users.deactivate(id, actorId))) {
      throw new NotFoundException('Usuário não encontrado ou já desativado.');
    }
    await this.sessions.revokeAllForUser(id, 'user_deactivated');
  }

  private async ensureUnique(login: string, email: string, exceptId?: number): Promise<void> {
    const conflict = await this.users.findConflict(login, email, exceptId);
    if (conflict === 'login') throw new ConflictException('Já existe um usuário com este login.');
    if (conflict === 'email') throw new ConflictException('Já existe um usuário com este e-mail.');
  }
}
