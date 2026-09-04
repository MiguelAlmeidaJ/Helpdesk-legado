import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  LogisticsExpensePaymentActionResponse,
  LogisticsExpensePaymentQueueResponse,
} from '@helpdesk/contracts';
import {
  ExpensePaymentRepository,
  type ExpensePaymentMutationResult,
} from '../infrastructure/expense-payment.repository';

@Injectable()
export class ExpensePaymentService {
  constructor(private readonly repository: ExpensePaymentRepository) {}

  queue(): Promise<LogisticsExpensePaymentQueueResponse> {
    return this.repository.queue();
  }

  async pay(
    payerId: number,
    expenseId: number,
    remarks: string,
  ): Promise<LogisticsExpensePaymentActionResponse> {
    return { ids: this.ids(await this.repository.pay(payerId, expenseId, remarks), 'paid') };
  }

  async reject(
    payerId: number,
    expenseId: number,
    remarks: string,
  ): Promise<LogisticsExpensePaymentActionResponse> {
    return {
      ids: this.ids(
        await this.repository.reject(payerId, expenseId, remarks),
        'rejected',
      ),
    };
  }

  async payBatch(
    payerId: number,
    entries: Array<{ id: number; remarks: string }>,
  ): Promise<LogisticsExpensePaymentActionResponse> {
    return {
      ids: this.ids(await this.repository.payBatch(payerId, entries), 'paid'),
    };
  }

  private ids(
    result: ExpensePaymentMutationResult,
    successKind: 'paid' | 'rejected',
  ): number[] {
    if (result.kind === 'not-found') {
      throw new NotFoundException(
        result.ids.length === 1
          ? 'Despesa não encontrada.'
          : `Despesas não encontradas: ${result.ids.join(', ')}.`,
      );
    }

    if (result.kind === 'not-approved') {
      throw new ConflictException(
        result.ids.length === 1
          ? 'A despesa não está mais aguardando pagamento.'
          : `Despesas não estão mais aguardando pagamento: ${result.ids.join(', ')}.`,
      );
    }

    if (result.kind !== successKind) {
      throw new ConflictException('Não foi possível atualizar o pagamento da despesa.');
    }

    return result.ids;
  }
}
