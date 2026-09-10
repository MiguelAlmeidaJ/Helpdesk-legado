import {
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type {
  LogisticsExpenseApprovalActionResponse,
  LogisticsExpenseApprovalQueueResponse,
} from '@helpdesk/contracts';
import { ExpenseApprovalNotifier } from './ports/expense-approval.notifier';
import {
  ExpenseApprovalRepository,
  type ExpenseApprovalMutationResult,
} from './ports/expense-approval.repository';
import { throwExpenseMutationFailure } from './expense-workflow';

@Injectable()
export class ExpenseApprovalService {
  private readonly logger = new Logger(ExpenseApprovalService.name);

  constructor(
    private readonly repository: ExpenseApprovalRepository,
    private readonly notifier: ExpenseApprovalNotifier,
  ) {}

  queue(): Promise<LogisticsExpenseApprovalQueueResponse> {
    return this.repository.queue();
  }

  attachmentContent(expenseId: number, attachmentKey: string) {
    return this.repository.attachmentContent(expenseId, attachmentKey);
  }

  async approve(
    approverId: number,
    expenseId: number,
    remarks: string,
  ): Promise<LogisticsExpenseApprovalActionResponse> {
    const result = await this.repository.approve(
      approverId,
      expenseId,
      remarks,
    );
    const items = this.approvedItems(result);
    await this.notify(items);
    return { ids: items.map((item) => item.id) };
  }

  async approveBatch(
    approverId: number,
    entries: Array<{ id: number; remarks: string }>,
  ): Promise<LogisticsExpenseApprovalActionResponse> {
    const result = await this.repository.approveBatch(approverId, entries);
    const items = this.approvedItems(result);
    await this.notify(items);
    return { ids: items.map((item) => item.id) };
  }

  async reject(expenseId: number): Promise<LogisticsExpenseApprovalActionResponse> {
    const result = await this.repository.reject(expenseId);
    throwExpenseMutationFailure(result, 'approval');
    if (result.kind !== 'rejected') {
      throw new ConflictException('Não foi possível recusar a despesa.');
    }
    return { ids: result.ids };
  }

  private approvedItems(result: ExpenseApprovalMutationResult) {
    throwExpenseMutationFailure(result, 'approval');
    if (result.kind !== 'approved') {
      throw new ConflictException('Não foi possível aprovar a despesa.');
    }
    return result.items;
  }

  private async notify(
    items: ReturnType<ExpenseApprovalService['approvedItems']>,
  ): Promise<void> {
    try {
      await this.notifier.sendApproved(items);
    } catch (error) {
      this.logger.error(
        'A aprovação foi concluída, mas o e-mail de RD falhou.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
