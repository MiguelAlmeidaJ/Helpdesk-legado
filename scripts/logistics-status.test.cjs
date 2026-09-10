const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  ExpenseStatus,
  canEditExpense,
  canTransitionExpense,
  expenseStatus,
  parseExpenseStatus,
} = require('../apps/api/dist/modules/logistics/domain/expense-status');

test('status de despesa reconhece os quatro estados persistidos', () => {
  assert.equal(parseExpenseStatus(1), ExpenseStatus.Pending);
  assert.equal(parseExpenseStatus('2'), ExpenseStatus.Approved);
  assert.equal(parseExpenseStatus(3n), ExpenseStatus.Rejected);
  assert.equal(parseExpenseStatus(4), ExpenseStatus.Paid);
});

test('status inválido não libera edição ou transição', () => {
  assert.equal(parseExpenseStatus(0), null);
  assert.equal(parseExpenseStatus('inválido'), null);
  assert.equal(canEditExpense(0), false);
  assert.equal(canTransitionExpense(0, 'approve'), false);
  assert.equal(canTransitionExpense(0, 'pay'), false);
});

test('normalização de resposta preserva pendente como fallback legado', () => {
  assert.equal(expenseStatus(99), ExpenseStatus.Pending);
  assert.equal(expenseStatus(null), ExpenseStatus.Pending);
});

test('somente despesa pendente pode ser editada', () => {
  assert.equal(canEditExpense(ExpenseStatus.Pending), true);
  assert.equal(canEditExpense(ExpenseStatus.Approved), false);
  assert.equal(canEditExpense(ExpenseStatus.Rejected), false);
  assert.equal(canEditExpense(ExpenseStatus.Paid), false);
});

test('aprovação e recusa partem apenas do estado pendente', () => {
  assert.equal(canTransitionExpense(ExpenseStatus.Pending, 'approve'), true);
  assert.equal(canTransitionExpense(ExpenseStatus.Pending, 'reject'), true);
  assert.equal(canTransitionExpense(ExpenseStatus.Approved, 'approve'), false);
  assert.equal(canTransitionExpense(ExpenseStatus.Approved, 'reject'), false);
});

test('pagamento parte apenas do estado aprovado', () => {
  assert.equal(canTransitionExpense(ExpenseStatus.Approved, 'pay'), true);
  assert.equal(canTransitionExpense(ExpenseStatus.Pending, 'pay'), false);
  assert.equal(canTransitionExpense(ExpenseStatus.Rejected, 'pay'), false);
  assert.equal(canTransitionExpense(ExpenseStatus.Paid, 'pay'), false);
});
