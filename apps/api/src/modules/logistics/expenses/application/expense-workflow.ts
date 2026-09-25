import { ConflictException, NotFoundException } from '@nestjs/common';

export type ExpenseWorkflowPhase = 'approval' | 'payment';

export type ExpenseMutationResultLike =
  | { kind: string; ids: number[] }
  | { kind: string; items: readonly unknown[] };

export function throwExpenseMutationFailure(
  result: ExpenseMutationResultLike,
  phase: ExpenseWorkflowPhase,
): void {
  if (result.kind === 'not-found') {
    const ids = mutationIds(result);
    throw new NotFoundException(
      ids.length === 1
        ? 'Despesa não encontrada.'
        : `Despesas não encontradas: ${ids.join(', ')}.`,
    );
  }

  const invalidStateKind =
    phase === 'approval' ? 'not-pending' : 'not-approved';
  if (result.kind !== invalidStateKind) return;

  const ids = mutationIds(result);
  const singular =
    phase === 'approval'
      ? 'A despesa não está mais aguardando aprovação.'
      : 'A despesa não está mais aguardando pagamento.';
  const pluralPrefix =
    phase === 'approval'
      ? 'Despesas não estão mais aguardando aprovação'
      : 'Despesas não estão mais aguardando pagamento';

  throw new ConflictException(
    ids.length === 1 ? singular : `${pluralPrefix}: ${ids.join(', ')}.`,
  );
}

function mutationIds(result: ExpenseMutationResultLike): number[] {
  return 'ids' in result ? result.ids : [];
}
