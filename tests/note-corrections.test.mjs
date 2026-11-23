import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../note-corrections.js';

const corrections = globalThis.LaundryNoteCorrections;

test('exposes invoice data while keeping identity, audit, and workflow fields protected', () => {
  const fields = corrections.getEditableFields({
    id: 'N-1',
    custName: 'Nadia',
    weightKg: 4.5,
    pcsCount: 3,
    items: [{ name: 'Cuci' }],
    currentStage: 7,
    stageHistory: { 7: { worker: 'A' } },
    workflowCorrections: [],
    noteCorrections: [],
    deletedCashflowSnapshots: [],
    isDeleted: false
  });

  assert.deepEqual(fields.map(([key]) => key), ['weightKg', 'pcsCount', 'items']);
});

test('adds incoming payment adjustment and ignores commission outflows', () => {
  const adjustment = corrections.createPaymentAdjustment({
    orderId: 'N-1',
    cashflows: [
      { orderId: 'N-1', type: 'IN', amount: 40000 },
      { orderId: 'N-1', type: 'OUT', amount: 15000, category: 'Komisi Agen' },
      { orderId: 'N-1', type: 'IN', amount: 10000, isDeleted: true }
    ],
    targetAmount: 60000,
    correctedBy: 'Admin',
    reason: 'Pembayaran sebelumnya kurang dicatat',
    timestamp: 100,
    id: 'CF-ADJ-1'
  });

  assert.equal(adjustment.type, 'IN');
  assert.equal(adjustment.amount, 20000);
  assert.equal(adjustment.correctionType, 'note-payment-adjustment');
  assert.equal(adjustment.orderId, 'N-1');
});

test('records a payment decrease as an outgoing correction and skips zero differences', () => {
  const cashflows = [
    { orderId: 'N-2', type: 'IN', amount: 90000 },
    { orderId: 'N-2', type: 'OUT', amount: 10000, correctionType: 'note-payment-adjustment' }
  ];
  const decrease = corrections.createPaymentAdjustment({
    orderId: 'N-2',
    cashflows,
    targetAmount: 50000,
    timestamp: 200,
    id: 'CF-ADJ-2'
  });

  assert.equal(decrease.type, 'OUT');
  assert.equal(decrease.amount, 30000);
  assert.equal(corrections.createPaymentAdjustment({
    orderId: 'N-2',
    cashflows,
    targetAmount: 80000
  }), null);
});

test('preserves financial values after pickup and allows pre-pickup commission reconciliation', () => {
  const pickedOrder = {
    id: 'N-3',
    total: 80000,
    paidAmount: 80000,
    agentCommissionAmount: 10000,
    currentStage: 7,
    stageHistory: { 7: { completedAt: 50 } }
  };
  const snapshot = corrections.createFinancialSnapshot(pickedOrder, 'Admin', 100);
  const flows = [{
    id: 'CF-COM-1',
    orderId: 'N-4',
    category: 'Komisi Agen',
    type: 'OUT',
    amount: 10000,
    isDeleted: false
  }];
  const commissionChange = corrections.reconcileCommissionCashflow({
    orderId: 'N-4',
    cashflows: flows,
    targetAmount: 15000,
    correctedBy: 'Admin',
    reason: 'Koreksi total nota',
    timestamp: 200
  });

  assert.equal(corrections.isFinanciallyClosed(pickedOrder), true);
  assert.equal(corrections.getFinancialValue({ ...pickedOrder, total: 120000, financialSnapshot: snapshot }, 'total'), 80000);
  assert.equal(snapshot.agentCommissionAmount, 10000);
  assert.equal(commissionChange.previousAmount, 10000);
  assert.equal(flows[0].amount, 15000);
  assert.equal(flows[0].correctionHistory.length, 1);
});

test('reconciles an editable package quantity against the matching member quota', () => {
  const order = {
    id: 'N-5',
    memberId: 'M-1',
    createdAt: 50,
    pkgUsedType: 'KG',
    pkgUsedAmount: 2,
    pkgRemainingAfter: 25
  };
  const nextOrder = { ...order, pkgUsedAmount: 4 };
  const plan = corrections.planMemberPackageQuotaCorrection({
    order,
    nextOrder,
    orders: [{ id: 'N-6', memberId: 'M-1', createdAt: 60, pkgUsedType: 'KG', pkgUsedAmount: 3 }],
    member: {
      id: 'M-1',
      monthlyPkg: { quotaType: 'KG', remainingQuota: 20, startAt: 0, expiresAt: 100 }
    }
  });

  assert.equal(nextOrder.pkgRemainingAfter, 21);
  assert.equal(plan.previousQuota, 20);
  assert.equal(plan.nextQuota, 16);
});

test('rejects package edits when the original package cannot be identified safely', () => {
  assert.throws(() => corrections.planMemberPackageQuotaCorrection({
    order: { id: 'N-7', memberId: 'M-1', createdAt: 50, pkgUsedType: 'KG', pkgUsedAmount: 2, pkgRemainingAfter: 8 },
    nextOrder: { id: 'N-7', memberId: 'M-1', createdAt: 50, pkgUsedType: 'KG', pkgUsedAmount: 1, pkgRemainingAfter: 8 },
    orders: [],
    member: { id: 'M-1', monthlyPkg: { quotaType: 'KG', remainingQuota: 5, startAt: 60, expiresAt: 100 } }
  }), /Paket yang digunakan nota tidak dapat dikenali/);
});
