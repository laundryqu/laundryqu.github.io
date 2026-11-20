(function (root) {
  function getActiveSorted(orders) {
    return (Array.isArray(orders) ? orders : [])
      .filter(order => order && !order.isDeleted)
      .slice()
      .sort((left, right) => (Number(right.createdAt) || 0) - (Number(left.createdAt) || 0));
  }

  function matchesSearch(order, query, fields) {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    if (!normalizedQuery) return true;
    return fields.some(field => String(order?.[field] || '').toLowerCase().includes(normalizedQuery));
  }

  root.LaundryOrderLists = { getActiveSorted, matchesSearch };
})(globalThis);
