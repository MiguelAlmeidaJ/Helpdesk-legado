import { Injectable, NotFoundException } from '@nestjs/common';
import { AppPermission } from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketProjectTaskImageRepository } from './ports/ticket-project-task-image.repository';
import { resolveTicketOperationAccess } from './ticket-operation-access';
import { resolveTicketReadAccess } from './ticket-read-access';

@Injectable()
export class TicketProjectTaskImages {
  constructor(
    private readonly repository: TicketProjectTaskImageRepository,
  ) {}

  async list(user: AuthenticatedUser, taskId: number) {
    const access = resolveTicketReadAccess(user);
    const images = await this.repository.list({
      taskId,
      actorUserId: user.id,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (!images) {
      throw new NotFoundException(
        'Tarefa de projeto não encontrada ou fora do seu escopo.',
      );
    }

    return { images };
  }

  async content(
    user: AuthenticatedUser,
    taskId: number,
    imageId: number,
  ) {
    const access = resolveTicketReadAccess(user);
    const content = await this.repository.content({
      taskId,
      imageId,
      actorUserId: user.id,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (!content) {
      throw new NotFoundException(
        'Imagem não encontrada ou fora do seu escopo.',
      );
    }

    return content;
  }

  async add(
    user: AuthenticatedUser,
    taskId: number,
    data: Buffer,
  ) {
    const access = resolveTicketOperationAccess(
      user,
      AppPermission.TicketsExecute,
    );
    const image = await this.repository.add({
      taskId,
      actorUserId: user.id,
      ownerTechnicianId: access.ownerTechnicianId,
      data,
    });

    if (!image) {
      throw new NotFoundException(
        'Tarefa de projeto não encontrada ou fora do seu escopo.',
      );
    }

    return image;
  }

  async replace(
    user: AuthenticatedUser,
    taskId: number,
    imageId: number,
    data: Buffer,
  ) {
    const access = resolveTicketOperationAccess(
      user,
      AppPermission.TicketsExecute,
    );
    const image = await this.repository.replace({
      taskId,
      imageId,
      actorUserId: user.id,
      ownerTechnicianId: access.ownerTechnicianId,
      data,
    });

    if (!image) {
      throw new NotFoundException(
        'Imagem não encontrada ou fora do seu escopo.',
      );
    }

    return image;
  }

  async remove(
    user: AuthenticatedUser,
    taskId: number,
    imageId: number,
  ): Promise<void> {
    const access = resolveTicketOperationAccess(
      user,
      AppPermission.TicketsExecute,
    );
    const deleted = await this.repository.delete({
      taskId,
      imageId,
      actorUserId: user.id,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (!deleted) {
      throw new NotFoundException(
        'Imagem não encontrada ou fora do seu escopo.',
      );
    }
  }
}
