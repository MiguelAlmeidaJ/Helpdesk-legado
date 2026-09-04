import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  LogisticsExpensePaidAdminEditResponse,
  LogisticsExpensePaidReportResponse,
  PermissionScope,
  UpdateLogisticsExpensePaidAdminRequest,
} from '@helpdesk/contracts';
import { ExpensePaidReportRepository } from '../infrastructure/expense-paid-report.repository';

export interface ExpensePaidReportQuery {
  startDate?: string;
  endDate?: string;
  actorUserId: number;
  scope: PermissionScope;
  userId?: number;
  clientName?: string;
  categoryIds: number[];
}

@Injectable()
export class ExpensePaidReportService {
  constructor(private readonly repository: ExpensePaidReportRepository) {}

  report(input: ExpensePaidReportQuery): Promise<LogisticsExpensePaidReportResponse> {
    return this.repository.report(input);
  }

  async edit(expenseId: number): Promise<LogisticsExpensePaidAdminEditResponse> {
    const result = await this.repository.edit(expenseId);
    if (result === 'not-found') {
      throw new NotFoundException('Despesa paga não encontrada.');
    }
    if (result === 'locked') {
      throw new ConflictException('A despesa não está mais com status pago.');
    }
    return result;
  }

  async update(
    expenseId: number,
    request: UpdateLogisticsExpensePaidAdminRequest,
  ): Promise<void> {
    const result = await this.repository.update(expenseId, request);
    if (result === 'not-found') {
      throw new NotFoundException('Despesa paga não encontrada.');
    }
    if (result === 'locked') {
      throw new ConflictException('A despesa não está mais com status pago.');
    }
    if (result === 'invalid-category') {
      throw new ConflictException('A categoria selecionada não é válida para esta RD.');
    }
    if (result === 'invalid-client') {
      throw new ConflictException('O cliente selecionado não existe.');
    }
    if (result === 'invalid-pix-type') {
      throw new ConflictException('O tipo de chave PIX selecionado não existe.');
    }
  }
}
