import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type {
  LogisticsExpensePaymentActionResponse,
  LogisticsExpensePaymentQueueResponse,
} from '@helpdesk/contracts';
import {
  ExpensePaymentRepository,
  type ExpensePaymentMutationResult,
} from './ports/expense-payment.repository';
import { throwExpenseMutationFailure } from './expense-workflow';

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
    throwExpenseMutationFailure(result, 'payment');

    if (result.kind !== successKind) {
      throw new ConflictException('Não foi possível atualizar o pagamento da despesa.');
    }

    return result.ids;
  }
}
