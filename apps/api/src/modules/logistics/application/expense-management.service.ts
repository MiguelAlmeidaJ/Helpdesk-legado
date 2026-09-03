import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateLogisticsExpenseRequest,
  LogisticsExpenseAttachment,
  LogisticsExpenseManagementResponse,
  UpdateLogisticsExpenseRequest,
} from '@helpdesk/contracts';
import { ExpenseManagementRepository } from '../infrastructure/expense-management.repository';

@Injectable()
export class ExpenseManagementService {
  constructor(private readonly repository: ExpenseManagementRepository) {}

  async get(
    userId: number,
    startDate: string,
    endDate: string,
  ): Promise<LogisticsExpenseManagementResponse> {
    const result = await this.repository.get(userId, startDate, endDate);
    if (!result) throw new NotFoundException('Usuário não encontrado.');
    return result;
  }

  async create(
    userId: number,
    request: CreateLogisticsExpenseRequest,
  ): Promise<{ id: number }> {
    const id = await this.repository.create(userId, request);
    if (!id) {
      throw new BadRequestException(
        'Categoria, cliente, tipo de PIX ou usuário inválido.',
      );
    }
    return { id };
  }

  async update(
    userId: number,
    id: number,
    request: UpdateLogisticsExpenseRequest,
  ): Promise<void> {
    const result = await this.repository.update(userId, id, request);
    if (result === 'not-found') {
      throw new NotFoundException('Despesa não encontrada.');
    }
    if (result === 'locked') {
      throw new ConflictException(
        'A despesa já foi processada e não pode mais ser editada.',
      );
    }
    if (result === 'invalid-catalog') {
      throw new BadRequestException(
        'Categoria, cliente ou tipo de PIX inválido.',
      );
    }
  }

  async delete(userId: number, id: number): Promise<void> {
    const result = await this.repository.delete(userId, id);
    if (result === 'not-found') {
      throw new NotFoundException('Despesa não encontrada.');
    }
    if (result === 'locked') {
      throw new ConflictException(
        'A despesa já foi processada e não pode mais ser excluída.',
      );
    }
  }

  async uploadAttachment(input: {
    userId: number;
    userName: string;
    expenseId: number;
    originalName: string;
    mimeType: string;
    data: Buffer;
  }): Promise<LogisticsExpenseAttachment> {
    const result = await this.repository.uploadAttachment(input);
    if (result === 'not-found') {
      throw new NotFoundException('Despesa não encontrada.');
    }
    if (result === 'locked') {
      throw new ConflictException(
        'A despesa já foi processada e não aceita novos anexos.',
      );
    }
    return result;
  }

  async deleteAttachment(
    userId: number,
    expenseId: number,
    key: string,
  ): Promise<void> {
    const result = await this.repository.deleteAttachment(
      userId,
      expenseId,
      key,
    );
    if (result === 'not-found') {
      throw new NotFoundException('Anexo ou despesa não encontrado.');
    }
    if (result === 'locked') {
      throw new ConflictException(
        'A despesa já foi processada e seus anexos não podem ser alterados.',
      );
    }
  }

  async attachmentContent(expenseId: number, key: string) {
    const content = await this.repository.attachmentContent(expenseId, key);
    if (!content) throw new NotFoundException('Anexo não encontrado.');
    return content;
  }
}
