import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppPermission,
  type TicketFacilityClassificationRequest,
  type TicketFacilityCreateRequest,
  type TicketFacilityCreateResponse,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import {
  TicketFacilityCommandRepository,
  type TicketFacilityCommandResult,
} from './ports/ticket-facility-command.repository';
import { resolveTicketOperationAccess } from './ticket-operation-access';
import { resolveTicketReadAccess } from './ticket-read-access';

interface BaseInput {
  user: AuthenticatedUser;
  facilityId: number;
}

function assertCommonResult(result: TicketFacilityCommandResult): void {
  if (result === 'not-found') {
    throw new NotFoundException(
      'Atendimento Facility não encontrado ou fora do seu escopo.',
    );
  }

  if (result === 'invalid-state') {
    throw new ConflictException(
      'O estado atual do atendimento Facility não permite esta operação.',
    );
  }
}

@Injectable()
export class TicketFacilityCommands {
  constructor(private readonly repository: TicketFacilityCommandRepository) {}

  async create(
    user: AuthenticatedUser,
    data: TicketFacilityCreateRequest,
  ): Promise<TicketFacilityCreateResponse> {
    const result = await this.repository.create({
      actorUserId: user.id,
      data,
    });

    if (result === 'forbidden-client') {
      throw new ForbiddenException('Cliente fora do escopo do usuário.');
    }

    if (result === 'invalid-reference') {
      throw new BadRequestException(
        'Um ou mais dados do atendimento Facility são inválidos ou estão inativos.',
      );
    }

    return result;
  }

  async updateClassification(
    user: AuthenticatedUser,
    facilityId: number,
    data: TicketFacilityClassificationRequest,
  ): Promise<void> {
    const access = resolveTicketOperationAccess(
      user,
      AppPermission.TicketsClassify,
    );

    const result = await this.repository.updateClassification({
      facilityId,
      actorUserId: user.id,
      ownerTechnicianId: access.ownerTechnicianId,
      data,
    });

    if (result === 'invalid-reference') {
      throw new BadRequestException(
        'A classificação informada é inválida ou está inativa.',
      );
    }

    assertCommonResult(result);
  }

  async addInteraction(
    input: BaseInput & { description: string },
  ): Promise<void> {
    const access = resolveTicketReadAccess(input.user);
    const result = await this.repository.addInteraction({
      facilityId: input.facilityId,
      actorUserId: input.user.id,
      ownerTechnicianId: access.ownerTechnicianId,
      description: input.description,
    });

    assertCommonResult(result);
  }

  async assign(
    input: BaseInput & { technicianId: number },
  ): Promise<void> {
    const access = resolveTicketOperationAccess(
      input.user,
      AppPermission.TicketsExecute,
    );

    if (
      access.ownerTechnicianId !== undefined &&
      input.technicianId !== input.user.id
    ) {
      throw new ForbiddenException(
        'Seu escopo permite iniciar apenas atendimentos atribuídos a você.',
      );
    }

    const result = await this.repository.assign({
      facilityId: input.facilityId,
      actorUserId: input.user.id,
      ownerTechnicianId: access.ownerTechnicianId,
      technicianId: input.technicianId,
    });

    if (result === 'invalid-technician') {
      throw new BadRequestException(
        'O técnico informado não existe, está inativo ou não pode receber atendimento.',
      );
    }

    assertCommonResult(result);
  }

  async putOnHold(
    input: BaseInput & { forecastAt: string; description: string },
  ): Promise<void> {
    const access = resolveTicketOperationAccess(
      input.user,
      AppPermission.TicketsHold,
    );

    const result = await this.repository.putOnHold({
      facilityId: input.facilityId,
      actorUserId: input.user.id,
      ownerTechnicianId: access.ownerTechnicianId,
      forecastAt: input.forecastAt,
      description: input.description,
    });

    if (result === 'already-on-hold') {
      throw new ConflictException(
        'O atendimento Facility já possui um registro de espera ativo.',
      );
    }

    assertCommonResult(result);
  }

  async resume(input: BaseInput): Promise<void> {
    const access = resolveTicketOperationAccess(
      input.user,
      AppPermission.TicketsHold,
    );

    const result = await this.repository.resume({
      facilityId: input.facilityId,
      actorUserId: input.user.id,
      ownerTechnicianId: access.ownerTechnicianId,
    });

    if (result === 'missing-active-hold') {
      throw new ConflictException(
        'O atendimento Facility não possui um registro de espera ativo.',
      );
    }

    assertCommonResult(result);
  }

  async reject(
    input: BaseInput & { technicianId: number; reason: string },
  ): Promise<void> {
    const access = resolveTicketOperationAccess(
      input.user,
      AppPermission.TicketsReject,
    );

    const result = await this.repository.reject({
      facilityId: input.facilityId,
      actorUserId: input.user.id,
      ownerTechnicianId: access.ownerTechnicianId,
      technicianId: input.technicianId,
      reason: input.reason,
    });

    if (result === 'invalid-technician') {
      throw new BadRequestException(
        'O técnico informado não existe, está inativo ou não pode receber atendimento.',
      );
    }

    assertCommonResult(result);
  }

  async finalize(
    input: BaseInput & { description: string },
  ): Promise<void> {
    const access = resolveTicketOperationAccess(
      input.user,
      AppPermission.TicketsClose,
    );
    const allowedStatuses =
      access.ownerTechnicianId === undefined ? [2, 3] : [2];

    const result = await this.repository.finalize({
      facilityId: input.facilityId,
      actorUserId: input.user.id,
      ownerTechnicianId: access.ownerTechnicianId,
      allowedStatuses,
      description: input.description,
    });

    assertCommonResult(result);
  }
}
