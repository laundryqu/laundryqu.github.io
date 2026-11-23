import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../finance-dashboard.js';

const dashboard = globalThis.LaundryFinanceDashboard;

test('aggregates monthly invoice revenue, outgoing cashflows, profit, and unpaid notes', () => {
  const result = dashboard.buildDashboardData({
    now: new Date(2026, 4, 20, 12),
    year: 2026,
    month: 4,
    orders: [
      { id: '1', createdAt: new Date(2026, 4, 2).getTime(), total: 100000, paidAmount: 50000, payStatus: 'DP' },
      { id: '2', createdAt: new Date(2026, 4, 12).getTime(), total: 50000, payStatus: 'Lunas' },
      { id: '3', createdAt: new Date(2026, 3, 30).getTime(), total: 70000, payStatus: 'Belum Bayar' },
      { id: '4', createdAt: new Date(2026, 4, 8).getTime(), total: 90000, isDeleted: true, payStatus: 'Belum Bayar' }
    ],
    cashflows: [
      { id: 'a', timestamp: new Date(2026, 4, 3).getTime(), type: 'OUT', amount: 20000 },
      { id: 'b', timestamp: new Date(2026, 4, 4).getTime(), type: 'IN', amount: 500000 },
      { id: 'c', timestamp: new Date(2026, 4, 5).getTime(), type: 'OUT', amount: 90000, isDeleted: true }
    ]
  });

  assert.deepEqual(result.currentMonth, { label: '', revenue: 150000, expenses: 20000, profit: 130000 });
  assert.equal(result.unpaidCount, 2);
  assert.equal(result.unpaidAmount, 120000);
  assert.equal(result.dailyTrend[1].revenue, 100000);
  assert.equal(result.dailyTrend[2].expenses, 20000);
  assert.equal(result.monthlyTrend[4].profit, 130000);
});

test('scopes an agent dashboard to their active notes and note-linked expenses', () => {
  const result = dashboard.buildDashboardData({
    now: new Date(2026, 5, 1),
    year: 2026,
    month: 5,
    agentId: 'agent-1',
    orders: [
      { id: 'A', agentId: 'agent-1', createdAt: new Date(2026, 5, 1).getTime(), total: 80000, payStatus: 'DP' },
      { id: 'B', agentId: 'agent-2', createdAt: new Date(2026, 5, 1).getTime(), total: 90000, payStatus: 'Belum Bayar' }
    ],
    cashflows: [
      { orderId: 'A', timestamp: new Date(2026, 5, 1).getTime(), type: 'OUT', amount: 10000 },
      { orderId: 'B', timestamp: new Date(2026, 5, 1).getTime(), type: 'OUT', amount: 20000 },
      { timestamp: new Date(2026, 5, 1).getTime(), type: 'OUT', amount: 30000 }
    ]
  });

  assert.equal(result.currentMonth.revenue, 80000);
  assert.equal(result.currentMonth.expenses, 10000);
  assert.equal(result.currentMonth.profit, 70000);
  assert.equal(result.unpaidCount, 1);
});

test('keeps picked-note financial metrics at their frozen values after a note correction', () => {
  const result = dashboard.buildDashboardData({
    now: new Date(2026, 6, 1),
    year: 2026,
    month: 6,
    orders: [{
      id: 'picked',
      createdAt: new Date(2026, 6, 1).getTime(),
      total: 130000,
      paidAmount: 130000,
      payStatus: 'Lunas',
      financialSnapshot: {
        total: 100000,
        paidAmount: 70000,
        payStatus: 'DP'
      }
    }],
    cashflows: []
  });

  assert.equal(result.currentMonth.revenue, 100000);
  assert.equal(result.unpaidCount, 1);
  assert.equal(result.unpaidAmount, 30000);
});

test('includes available data years and the current year', () => {
  const years = dashboard.getAvailableYears(
    [{ createdAt: new Date(2024, 0, 1).getTime() }],
    [{ timestamp: new Date(2025, 0, 1).getTime() }],
    2026
  );
  assert.deepEqual(years, [2026, 2025, 2024]);
});
