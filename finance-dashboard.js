(function (root) {
  function toAmount(value) {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
  }

  function createBucket(label) {
    return { label, revenue: 0, expenses: 0, profit: 0 };
  }

  function financialValue(order, field) {
    if (order.financialSnapshot
      && Object.prototype.hasOwnProperty.call(order.financialSnapshot, field)) {
      return order.financialSnapshot[field];
    }
    return order[field];
  }

  function aggregate(orders, cashflows, start, end) {
    const bucket = createBucket('');
    orders.forEach(order => {
      const timestamp = Number(order.createdAt) || 0;
      if (timestamp >= start && timestamp < end) bucket.revenue += toAmount(financialValue(order, 'total'));
    });
    cashflows.forEach(flow => {
      const timestamp = Number(flow.timestamp) || 0;
      if (timestamp >= start && timestamp < end) bucket.expenses += toAmount(flow.amount);
    });
    bucket.profit = bucket.revenue - bucket.expenses;
    return bucket;
  }

  function getAvailableYears(orders, cashflows, currentYear) {
    const years = new Set([currentYear]);
    [...orders, ...cashflows].forEach(record => {
      const timestamp = Number(record.createdAt ?? record.timestamp) || 0;
      if (timestamp > 0) years.add(new Date(timestamp).getFullYear());
    });
    return [...years].filter(Number.isFinite).sort((left, right) => right - left);
  }

  function buildDashboardData({ orders = [], cashflows = [], agentId = null, year, month, now = new Date() }) {
    const selectedYear = Number(year);
    const selectedMonth = Number(month);
    if (!Number.isInteger(selectedYear) || !Number.isInteger(selectedMonth) || selectedMonth < 0 || selectedMonth > 11) {
      throw new RangeError('Tahun dan bulan dasbor tidak valid.');
    }

    const activeOrders = orders.filter(order => order && !order.isDeleted
      && (agentId == null || String(order.agentId) === String(agentId)));
    const orderIds = new Set(activeOrders.map(order => String(order.id)));
    const expenses = cashflows.filter(flow => flow && !flow.isDeleted && flow.type === 'OUT'
      && (agentId == null || orderIds.has(String(flow.orderId))));
    const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    const currentMonth = aggregate(activeOrders, expenses, currentPeriodStart, currentPeriodEnd);
    const monthStart = new Date(selectedYear, selectedMonth, 1).getTime();
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const dailyTrend = Array.from({ length: daysInMonth }, (_, day) => {
      const start = new Date(selectedYear, selectedMonth, day + 1).getTime();
      const bucket = aggregate(activeOrders, expenses, start, new Date(selectedYear, selectedMonth, day + 2).getTime());
      bucket.label = String(day + 1);
      return bucket;
    });
    const monthlyTrend = Array.from({ length: 12 }, (_, selectedIndex) => {
      const start = new Date(selectedYear, selectedIndex, 1).getTime();
      const bucket = aggregate(activeOrders, expenses, start, new Date(selectedYear, selectedIndex + 1, 1).getTime());
      bucket.label = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(selectedYear, selectedIndex, 1));
      return bucket;
    });
    const unpaidOrders = activeOrders.filter(order => financialValue(order, 'payStatus') !== 'Lunas');

    return {
      currentMonth,
      unpaidCount: unpaidOrders.length,
      unpaidAmount: unpaidOrders.reduce((total, order) =>
        total + Math.max(0, toAmount(financialValue(order, 'total')) - toAmount(financialValue(order, 'paidAmount'))), 0),
      dailyTrend,
      monthlyTrend,
      availableYears: getAvailableYears(activeOrders, expenses, now.getFullYear()),
      selectedYear,
      selectedMonth,
      monthStart
    };
  }

  root.LaundryFinanceDashboard = { buildDashboardData, getAvailableYears };
})(globalThis);
