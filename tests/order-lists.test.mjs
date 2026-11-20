import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../order-lists.js';

const orderLists = globalThis.LaundryOrderLists;

test('returns every active order in newest-first order and excludes trashed notes', () => {
  const orders = Array.from({ length: 125 }, (_, index) => ({
    id: String(index + 1),
    createdAt: index
  }));
  orders.push({ id: 'deleted', createdAt: 200, isDeleted: true });

  const visible = orderLists.getActiveSorted(orders);

  assert.equal(visible.length, 125);
  assert.equal(visible[0].id, '125');
  assert.equal(visible[visible.length - 1].id, '1');
  assert.equal(visible.some(order => order.id === 'deleted'), false);
  assert.equal(orders.length, 126);
});

test('searches note identifiers and customer fields safely', () => {
  const order = { id: 123, custName: 'Aisyah Putri', custPhone: null };

  assert.equal(orderLists.matchesSearch(order, '123', ['id', 'custName', 'custPhone']), true);
  assert.equal(orderLists.matchesSearch(order, 'aisyah', ['id', 'custName', 'custPhone']), true);
  assert.equal(orderLists.matchesSearch(order, 'unknown', ['id', 'custName', 'custPhone']), false);
  assert.equal(orderLists.matchesSearch(order, '', ['id', 'custName']), true);
});
