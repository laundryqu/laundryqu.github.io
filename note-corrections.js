(function (root) {
  const protectedFields = new Set([
    'id',
    'custName',
    'currentStage',
    'stageHistory',
    'workflowCorrections',
    'noteCorrections',
    'financialSnapshot',
    'isDeleted',
    'deletedAt',
    'deletedBy',
    'deleteReason',
    'deletedCashflowSnapshots'
  ]);
  const PAYMENT_ADJUSTMENT_TYPE = 'note-payment-adjustment';

  function getEditableFields(order) {
    return Object.entries(order || {}).filter(([key]) =>
      !protectedFields.has(key) && !['__proto__', 'constructor', 'prototype'].includes(key)
    );
  }

  function valuesEqual(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function getRecordedPaymentAmount(orderId, cashflows) {
    return (Array.isArray(cashflows) ? cashflows : []).reduce((total, flow) => {
      if (!flow || flow.isDeleted || String(flow.orderId) !== String(orderId)) return total;
      const amount = Number(flow.amount);
      if (!Number.isFinite(amount)) return total;
      if (flow.type === 'IN') return total + amount;
      if (flow.type === 'OUT' && flow.correctionType === PAYMENT_ADJUSTMENT_TYPE) return total - amount;
      return total;
    }, 0);
  }

  function createPaymentAdjustment({
    orderId,
    cashflows,
    targetAmount,
    correctedBy,
    reason,
    timestamp = Date.now(),
    id
  }) {
    const target = Number(targetAmount);
    if (!Number.isFinite(target) || target < 0) throw new RangeError('Nominal pembayaran nota tidak valid.');
    const previousAmount = getRecordedPaymentAmount(orderId, cashflows);
    const difference = Math.round((target - previousAmount) * 100) / 100;
    if (Math.abs(difference) < 0.01) return null;

    return {
      id: id || `CF-ADJ-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp,
      description: `Koreksi pembayaran Nota ${orderId} oleh ${correctedBy || 'Admin'}`,
      category: 'Koreksi Pembayaran Nota',
      type: difference > 0 ? 'IN' : 'OUT',
      amount: Math.abs(difference),
      orderId: String(orderId),
      isDeleted: false,
      correctionType: PAYMENT_ADJUSTMENT_TYPE,
      correctedBy: correctedBy || 'Admin',
      correctionReason: reason || ''
    };
  }

  function snapshotAuditValue(value) {
    if (value === undefined) return null;
    const serialized = JSON.stringify(value);
    if (serialized.length <= 5000) return JSON.parse(serialized);
    return {
      summary: Array.isArray(value) ? `Daftar berisi ${value.length} item` : 'Data terstruktur berukuran besar',
      serializedLength: serialized.length
    };
  }

  function isFinanciallyClosed(order) {
    if (!order) return false;
    if (order.financialSnapshot || Number(order.currentStage) === 7 || order.stageHistory?.[7]?.completedAt) return true;
    return (order.workflowCorrections || []).some(correction =>
      correction?.previousHistory?.[7]?.completedAt || correction?.nextHistory?.[7]?.completedAt
    );
  }

  function getFinancialValue(order, field) {
    if (order?.financialSnapshot
      && Object.prototype.hasOwnProperty.call(order.financialSnapshot, field)) {
      return order.financialSnapshot[field];
    }
    return order?.[field];
  }

  function createFinancialSnapshot(order, correctedBy, timestamp = Date.now()) {
    const snapshot = { capturedAt: timestamp, capturedBy: correctedBy || 'Admin' };
    [
      'subtotal',
      'total',
      'paidAmount',
      'payStatus',
      'changeAmount',
      'agentCommissionAmount',
      'agentCollectedAmount',
      'agentRemittedAmount',
      'agentCommissionPayoutAmount',
      'agentNetRemittance',
      'agentRemittedAt'
    ]
      .forEach(field => {
        if (Object.prototype.hasOwnProperty.call(order || {}, field)) snapshot[field] = order[field];
      });
    return snapshot;
  }

  function reconcileCommissionCashflow({ orderId, cashflows, targetAmount, correctedBy, reason, timestamp = Date.now() }) {
    const target = Number(targetAmount);
    if (!Number.isFinite(target) || target < 0) throw new RangeError('Nominal komisi agen tidak valid.');
    const matchingFlows = (Array.isArray(cashflows) ? cashflows : []).filter(flow =>
      flow && !flow.isDeleted
      && String(flow.orderId) === String(orderId)
      && flow.type === 'OUT'
      && flow.category === 'Komisi Agen'
    );
    if (!matchingFlows.length) return null;

    const previousAmount = matchingFlows.reduce((sum, flow) => sum + (Number(flow.amount) || 0), 0);
    if (Math.abs(previousAmount - target) < 0.01) return null;

    const primaryFlow = matchingFlows[0];
    if (!Array.isArray(primaryFlow.correctionHistory)) primaryFlow.correctionHistory = [];
    primaryFlow.correctionHistory.push({
      correctedAt: timestamp,
      correctedBy: correctedBy || 'Admin',
      reason: reason || '',
      previousAmount,
      amount: target
    });
    primaryFlow.amount = target;
    primaryFlow.correctedAt = timestamp;
    primaryFlow.correctedBy = correctedBy || 'Admin';

    matchingFlows.slice(1).forEach(flow => {
      if (!Array.isArray(flow.correctionHistory)) flow.correctionHistory = [];
      flow.correctionHistory.push({
        correctedAt: timestamp,
        correctedBy: correctedBy || 'Admin',
        reason: reason || '',
        previousAmount: Number(flow.amount) || 0,
        amount: 0
      });
      flow.isDeleted = true;
      flow.deletedBy = correctedBy || 'Admin';
      flow.deleteReason = 'Digabung saat koreksi komisi nota';
    });

    return { flowId: primaryFlow.id, previousAmount, amount: target };
  }

  function planMemberPackageQuotaCorrection({ order, nextOrder, orders, member }) {
    const previousUsage = Math.max(0, Number(order?.pkgUsedAmount) || 0);
    const nextUsage = Math.max(0, Number(nextOrder?.pkgUsedAmount) || 0);
    const packageFieldsChanged = !valuesEqual(order?.memberId, nextOrder?.memberId)
      || !valuesEqual(order?.pkgUsedType, nextOrder?.pkgUsedType)
      || !valuesEqual(order?.pkgUsedAmount, nextOrder?.pkgUsedAmount)
      || !valuesEqual(order?.pkgRemainingAfter, nextOrder?.pkgRemainingAfter)
      || !valuesEqual(order?.createdAt, nextOrder?.createdAt);
    if (!packageFieldsChanged || (previousUsage === 0 && nextUsage === 0)) return null;
    if (!valuesEqual(order.memberId, nextOrder.memberId)) {
      throw new Error('ID member pada nota yang memakai kuota paket tidak dapat dipindah otomatis. Periksa pemakaian kuota secara manual.');
    }
    if (!valuesEqual(order.createdAt, nextOrder.createdAt)) {
      throw new Error('Tanggal nota yang memakai kuota paket tidak dapat diubah otomatis. Periksa riwayat kuota secara manual.');
    }

    const packageData = member?.monthlyPkg;
    const noteTime = Number(order.createdAt) || 0;
    const startsAt = Number(packageData?.startAt) || 0;
    const expiresAt = Number(packageData?.expiresAt) || 0;
    const quotaType = packageData?.quotaType || 'KG';
    if (!packageData || !noteTime || noteTime < startsAt || noteTime > expiresAt) {
      throw new Error('Paket yang digunakan nota tidak dapat dikenali. Periksa saldo kuota member secara manual sebelum mengubah pemakaian paket.');
    }
    if ((previousUsage > 0 && order.pkgUsedType !== quotaType)
      || (nextUsage > 0 && nextOrder.pkgUsedType !== quotaType)) {
      throw new Error('Jenis paket pada nota tidak cocok dengan paket member yang teridentifikasi.');
    }

    const currentQuota = Number(packageData.remainingQuota);
    if (!Number.isFinite(currentQuota) || currentQuota < 0) {
      throw new Error('Saldo kuota paket member tidak valid.');
    }
    const laterUsage = (Array.isArray(orders) ? orders : []).reduce((total, item) => {
      if (!item || item.isDeleted || String(item.id) === String(order.id)
        || String(item.memberId) !== String(order.memberId)
        || item.pkgUsedType !== quotaType) return total;
      const createdAt = Number(item.createdAt) || 0;
      return createdAt > noteTime && createdAt <= expiresAt
        ? total + Math.max(0, Number(item.pkgUsedAmount) || 0)
        : total;
    }, 0);
    const openingQuota = currentQuota + laterUsage + previousUsage;
    const savedRemaining = Number(order.pkgRemainingAfter);
    const previousRemaining = order.pkgRemainingAfter != null && Number.isFinite(savedRemaining)
      ? savedRemaining
      : openingQuota - previousUsage;
    const remainingWasEdited = !valuesEqual(order.pkgRemainingAfter, nextOrder.pkgRemainingAfter);
    let nextRemaining;
    if (remainingWasEdited) {
      if (nextOrder.pkgRemainingAfter == null) {
        throw new Error('Sisa kuota paket setelah nota wajib diisi untuk menjaga saldo member.');
      }
      nextRemaining = Number(nextOrder.pkgRemainingAfter);
      if (!Number.isFinite(nextRemaining) || nextRemaining < 0) {
        throw new Error('Sisa kuota paket setelah nota harus berupa angka nol atau lebih.');
      }
    } else {
      nextRemaining = openingQuota - nextUsage;
      nextOrder.pkgRemainingAfter = Number(nextRemaining.toFixed(2));
    }
    const adjustedCurrentQuota = Number((currentQuota + nextRemaining - previousRemaining).toFixed(2));
    if (nextRemaining < 0 || adjustedCurrentQuota < 0) {
      throw new Error('Koreksi pemakaian akan membuat kuota paket negatif. Periksa transaksi member terlebih dahulu.');
    }

    return {
      member,
      previousQuota: currentQuota,
      nextQuota: adjustedCurrentQuota,
      previousRemaining,
      nextRemaining: Number(nextRemaining.toFixed(2))
    };
  }

  root.LaundryNoteCorrections = {
    getEditableFields,
    valuesEqual,
    getRecordedPaymentAmount,
    createPaymentAdjustment,
    snapshotAuditValue,
    isFinanciallyClosed,
    getFinancialValue,
    createFinancialSnapshot,
    reconcileCommissionCashflow,
    planMemberPackageQuotaCorrection
  };
})(globalThis);
