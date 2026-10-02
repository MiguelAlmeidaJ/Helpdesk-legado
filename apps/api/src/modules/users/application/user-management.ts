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
    roleId?: number,
  ): Promise<ManagedUserListResponse> {
    return this.users.list(page, limit, search, statusFilter, roleId);
  }

  async detail(id: number): Promise<ManagedUserDetail> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  catalogs(includeSystemAdmin: boolean): Promise<UserManagementCatalogs> {
    return this.users.catalogs(includeSystemAdmin);
  }

  async create(
    input: CreateManagedUserRequest,
    actorId: number,
    canAssignRole: boolean,
    actorIsSystemAdmin: boolean,
  ): Promise<ManagedUserDetail> {
    if (!canAssignRole && input.roleIds !== undefined && input.type !== 2) {
      throw new ForbiddenException('Sem permissão para definir acessos do usuário.');
    }
    await this.ensureUnique(input.login, input.email);
    const roleIds = await this.roleIdsForType(input.type, input.roleIds, canAssignRole, actorIsSystemAdmin);
    if (roleIds) await this.ensureRolesExist(roleIds);
    const normalizedInput = { ...input, roleIds };
    const passwordHash = await bcrypt.hash(input.password, 12);
    const id = await this.users.create(
      normalizedInput,
      passwordHash,
      actorId,
      canAssignRole || input.type === 2,
    );
    return this.detail(id);
  }

  async update(
    id: number,
    actorId: number,
    input: UpdateManagedUserRequest,
    canAssignRole: boolean,
    actorIsSystemAdmin: boolean,
  ): Promise<ManagedUserDetail> {
    if (input.status === 2 && (id === 1 || id === actorId)) {
      throw new ForbiddenException('O usuário administrador principal e a própria conta não podem ser desativados.');
    }
    if (!canAssignRole && input.roleIds !== undefined && input.type !== 2) {
      throw new ForbiddenException('Sem permissão para alterar acessos do usuário.');
    }
    await this.ensureUnique(input.login, input.email, id);
    const protectedGlobalAdmin =
      !actorIsSystemAdmin && (await this.users.userHasSystemAdminRole(id));
    const roleIds = protectedGlobalAdmin
      ? undefined
      : await this.roleIdsForType(
          input.type,
          input.roleIds,
          canAssignRole,
          actorIsSystemAdmin,
        );
    if (roleIds) await this.ensureRolesExist(roleIds);
    const normalizedInput = { ...input, roleIds };
    if (!(await this.users.update(
      id,
      normalizedInput,
      (canAssignRole && !protectedGlobalAdmin) || input.type === 2,
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
    if (!(await this.users.deactivate(id))) {
      throw new NotFoundException('Usuário não encontrado ou já desativado.');
    }
    await this.sessions.revokeAllForUser(id, 'user_deactivated');
  }

  private async roleIdsForType(
    type: 1 | 2,
    requestedRoleIds: number[] | undefined,
    canAssignRole: boolean,
    actorIsSystemAdmin: boolean,
  ): Promise<number[] | undefined> {
    const clientRoleId = await this.users.clientRoleId();

    if (type === 2) {
      if (!clientRoleId) {
        throw new NotFoundException('O tipo de usuário Cliente não está cadastrado em Permissões.');
      }
      return [clientRoleId];
    }

    if (!canAssignRole) return undefined;
    const roleIds = (requestedRoleIds ?? []).filter((id) => id !== clientRoleId);
    if (
      !actorIsSystemAdmin &&
      (await this.users.containsSystemAdminRole(roleIds))
    ) {
      throw new ForbiddenException(
        'Somente um Administrador global pode atribuir o tipo Administrador global.',
      );
    }
    return roleIds;
  }

  private async ensureRolesExist(roleIds: number[]): Promise<void> {
    if (!(await this.users.rolesExist(roleIds))) {
      throw new NotFoundException('Um ou mais tipos de usuário não existem.');
    }
  }

  private async ensureUnique(login: string, email: string, exceptId?: number): Promise<void> {
    const conflict = await this.users.findConflict(login, email, exceptId);
    if (conflict === 'login') throw new ConflictException('Já existe um usuário com este login.');
    if (conflict === 'email') throw new ConflictException('Já existe um usuário com este e-mail.');
  }
}
