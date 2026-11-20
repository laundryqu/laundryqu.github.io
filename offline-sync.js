(function (root) {
  const collectionKeyFields = {
    adminUsers: 'id',
    employees: 'id',
    agents: 'id',
    services: 'id',
    vouchers: 'code',
    members: 'id',
    inventory: 'id',
    expenses: 'id',
    cashflows: 'id',
    agentCommissionPayouts: 'id',
    orders: 'id',
    pickupOrders: 'orderNumber'
  };

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === 'object') {
      return Object.keys(value).sort().reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, Object.create(null));
    }
    return value;
  }

  function equal(left, right) {
    if (left === undefined || right === undefined) return left === right;
    return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
  }

  function sameValue(leftExists, leftValue, rightExists, rightValue) {
    return leftExists === rightExists && (!leftExists || equal(leftValue, rightValue));
  }

  function recordKey(collection, record, index) {
    if (typeof record === 'string' || typeof record === 'number') {
      return `${typeof record}:${record}`;
    }

    if (record && typeof record === 'object') {
      const fields = [collectionKeyFields[collection], 'id', 'orderNumber', 'code', 'name', 'email', 'phone', 'timestamp']
        .filter((field, position, list) => field && list.indexOf(field) === position);
      for (const field of fields) {
        if (record[field] !== undefined && record[field] !== null && String(record[field]) !== '') {
          return `${field}:${record[field]}`;
        }
      }
    }

    return `index:${index}`;
  }

  function indexCollection(records, collection) {
    const indexed = new Map();
    (Array.isArray(records) ? records : []).forEach((record, index) => {
      indexed.set(recordKey(collection, record, index), { value: record, index });
    });
    return indexed;
  }

  function diff(before, after) {
    const operations = [];
    const beforeSettings = before?.settings || {};
    const afterSettings = after?.settings || {};
    const settingKeys = new Set([...Object.keys(beforeSettings), ...Object.keys(afterSettings)]);

    settingKeys.forEach(key => {
      const beforeExists = Object.prototype.hasOwnProperty.call(beforeSettings, key);
      const afterExists = Object.prototype.hasOwnProperty.call(afterSettings, key);
      const beforeValue = beforeSettings[key];
      const afterValue = afterSettings[key];
      if (sameValue(beforeExists, beforeValue, afterExists, afterValue)) return;
      operations.push({
        id: `setting:${key}`,
        kind: 'setting',
        key,
        beforeExists,
        beforeValue: clone(beforeValue),
        afterExists,
        afterValue: clone(afterValue)
      });
    });

    const collectionNames = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {})
    ].filter(key => Array.isArray(before?.[key]) || Array.isArray(after?.[key])));

    collectionNames.forEach(collection => {
      const beforeEntries = indexCollection(before?.[collection], collection);
      const afterEntries = indexCollection(after?.[collection], collection);
      const keys = new Set([...beforeEntries.keys(), ...afterEntries.keys()]);
      keys.forEach(key => {
        const beforeEntry = beforeEntries.get(key);
        const afterEntry = afterEntries.get(key);
        const beforeExists = Boolean(beforeEntry);
        const afterExists = Boolean(afterEntry);
        const beforeValue = beforeEntry?.value;
        const afterValue = afterEntry?.value;
        if (sameValue(beforeExists, beforeValue, afterExists, afterValue)) return;
        operations.push({
          id: `record:${collection}:${key}`,
          kind: 'record',
          collection,
          key,
          beforeExists,
          beforeValue: clone(beforeValue),
          beforeIndex: beforeEntry?.index ?? -1,
          afterExists,
          afterValue: clone(afterValue),
          afterIndex: afterEntry?.index ?? -1
        });
      });
    });

    return operations;
  }

  function coalesce(existing, incoming) {
    const operations = (existing || []).map(clone);
    (incoming || []).forEach(next => {
      const index = operations.findIndex(operation => operation.id === next.id);
      if (index < 0) {
        operations.push(clone(next));
        return;
      }

      const combined = {
        ...operations[index],
        afterExists: next.afterExists,
        afterValue: clone(next.afterValue),
        afterIndex: next.afterIndex
      };
      if (sameValue(combined.beforeExists, combined.beforeValue, combined.afterExists, combined.afterValue)) {
        operations.splice(index, 1);
      } else {
        operations[index] = combined;
      }
    });
    return operations;
  }

  function read(data, operation) {
    if (operation.kind === 'setting') {
      const settings = data?.settings || {};
      const exists = Object.prototype.hasOwnProperty.call(settings, operation.key);
      return { exists, value: exists ? settings[operation.key] : undefined, index: -1 };
    }

    const records = Array.isArray(data?.[operation.collection]) ? data[operation.collection] : [];
    const index = records.findIndex((record, position) => recordKey(operation.collection, record, position) === operation.key);
    return { exists: index >= 0, value: index >= 0 ? records[index] : undefined, index };
  }

  function apply(data, operation, exists, value, index) {
    if (operation.kind === 'setting') {
      if (!data.settings || typeof data.settings !== 'object') data.settings = {};
      if (exists) data.settings[operation.key] = clone(value);
      else delete data.settings[operation.key];
      return data;
    }

    if (!Array.isArray(data[operation.collection])) data[operation.collection] = [];
    const records = data[operation.collection];
    const currentIndex = records.findIndex((record, position) => recordKey(operation.collection, record, position) === operation.key);
    if (!exists) {
      if (currentIndex >= 0) records.splice(currentIndex, 1);
      return data;
    }

    if (currentIndex >= 0) {
      records[currentIndex] = clone(value);
    } else {
      const insertAt = Number.isInteger(index) && index >= 0 ? Math.min(index, records.length) : records.length;
      records.splice(insertAt, 0, clone(value));
    }
    return data;
  }

  function applyPending(remote, operations) {
    const candidate = clone(remote || {});
    const conflicts = [];
    let changed = false;

    (operations || []).forEach(operation => {
      const current = read(candidate, operation);
      if (sameValue(current.exists, current.value, operation.afterExists, operation.afterValue)) return;
      if (sameValue(current.exists, current.value, operation.beforeExists, operation.beforeValue)) {
        apply(candidate, operation, operation.afterExists, operation.afterValue, operation.afterIndex);
        changed = true;
        return;
      }
      conflicts.push({
        operation: clone(operation),
        remoteExists: current.exists,
        remoteValue: clone(current.value),
        remoteIndex: current.index
      });
    });

    return { ok: conflicts.length === 0, data: candidate, conflicts, changed };
  }

  root.LaundryOfflineSync = { apply, applyPending, clone, coalesce, diff, equal, read, sameValue };
})(globalThis);
