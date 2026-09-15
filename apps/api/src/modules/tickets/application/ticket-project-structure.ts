import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppPermission,
  type TicketProjectCreateRequest,
  type TicketProjectCreateResponse,
  type TicketProjectTaskCreateRequest,
  type TicketProjectTaskCreateResponse,
  type TicketProjectTaskUpdateRequest,
  type TicketProjectUpdateRequest,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketProjectStructureRepository } from './ports/ticket-project-structure.repository';
import { resolveTicketOperationAccess } from './ticket-operation-access';
import { resolveTicketReadAccess } from './ticket-read-access';

@Injectable()
export class TicketProjectStructure {
  constructor(private readonly repository: TicketProjectStructureRepository) {}

  async createProject(
    user: AuthenticatedUser,
    data: TicketProjectCreateRequest,
  ): Promise<TicketProjectCreateResponse> {
    const result = await this.repository.createProject({
      actorUserId: user.id,
      data,
    });

    if (result === 'forbidden-client') {
      throw new ForbiddenException('Cliente fora do escopo do usuário.');
    }

    if (result === 'invalid-reference') {
      throw new BadRequestException(
        'Um ou mais dados do projeto são inválidos ou estão inativos.',
      );
    }

    return result;
  }

  async updateProject(
    user: AuthenticatedUser,
    projectId: number,
    data: TicketProjectUpdateRequest,
  ): Promise<void> {
    const access = resolveTicketOperationAccess(
      user,
      AppPermission.TicketsEdit,
    );
    const result = await this.repository.updateProject({
      projectId,
      actorUserId: user.id,
      ownerTechnicianId: access.ownerTechnicianId,
      data,
    });

    this.assertStructureResult(result, 'Projeto');
  }

  async createTask(
    user: AuthenticatedUser,
    projectId: number,
    data: TicketProjectTaskCreateRequest,
  ): Promise<TicketProjectTaskCreateResponse> {
    const access = resolveTicketReadAccess(user);
    const result = await this.repository.createTask({
      projectId,
      actorUserId: user.id,
      ownerTechnicianId: access.ownerTechnicianId,
      data,
    });

    if (result === 'not-found') {
      throw new NotFoundException(
        'Projeto não encontrado ou fora do seu escopo.',
      );
    }

    if (result === 'invalid-state') {
      throw new ConflictException(
        'Não é possível adicionar tarefas a um projeto finalizado.',
      );
    }

    if (result === 'invalid-reference') {
      throw new BadRequestException(
        'Um ou mais dados da tarefa são inválidos ou estão inativos.',
      );
    }

    if (result === 'invalid-dependency') {
      throw new BadRequestException(
        'A dependência deve apontar para uma tarefa do mesmo projeto.',
      );
    }

    return result;
  }

  async updateTask(
    user: AuthenticatedUser,
    taskId: number,
    data: TicketProjectTaskUpdateRequest,
  ): Promise<void> {
    const access = resolveTicketOperationAccess(
      user,
      AppPermission.TicketsEdit,
    );
    const result = await this.repository.updateTask({
      taskId,
      actorUserId: user.id,
      ownerTechnicianId: access.ownerTechnicianId,
      data,
    });

    this.assertStructureResult(result, 'Tarefa de projeto');
  }

  async updateTaskDependency(
    user: AuthenticatedUser,
    taskId: number,
    dependencyTaskId: number,
  ): Promise<void> {
    const access = resolveTicketOperationAccess(
      user,
      AppPermission.TicketsEdit,
    );
    const result = await this.repository.updateTaskDependency({
      taskId,
      dependencyTaskId,
      actorUserId: user.id,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (result === 'invalid-dependency') {
      throw new BadRequestException(
        'A dependência deve apontar para outra tarefa do mesmo projeto.',
      );
    }

    if (result === 'dependency-cycle') {
      throw new ConflictException(
        'A dependência informada criaria um ciclo entre tarefas.',
      );
    }

    this.assertStructureResult(result, 'Tarefa de projeto');
  }

  private assertStructureResult(
    result: 'updated' | 'not-found' | 'invalid-reference',
    label: string,
  ): void {
    if (result === 'not-found') {
      throw new NotFoundException(
        `${label} não encontrado ou fora do seu escopo.`,
      );
    }

    if (result === 'invalid-reference') {
      throw new BadRequestException(
        `Um ou mais dados de ${label.toLowerCase()} são inválidos ou estão inativos.`,
      );
    }
  }
}
