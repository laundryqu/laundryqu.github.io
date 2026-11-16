import React from 'react';
import { CircleDollarSign, FileText, Wallet } from 'lucide-react';
import { formatRupiah } from '../workspace/formatters.js';

const moneyReceived = order => Math.max(0, Number(order.paidAmount) || 0);

export function AgentFinanceReport({ data, agent }) {
  const orders = (Array.isArray(data?.orders) ? data.orders : Object.values(data?.orders || {}))
    .filter(order => order && !order.isDeleted && String(order.agentId) === String(agent?.id))
    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
  const totalSales = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const collected = orders.reduce((sum, order) => sum + moneyReceived(order), 0);
  const commissions = orders.reduce((sum, order) => sum + (Number(order.agentCommissionAmount) || 0), 0);

  return (
    <section className="report-layout">
      <div className="report-heading">
        <div className="eyebrow"><CircleDollarSign size={16} /> Laporan Keuangan Agen</div>
        <h2>Ringkasan pendapatan · {agent?.name}</h2>
        <p>Rekap nota yang terhubung ke akun agen ini, termasuk pelunasan dan komisi yang tercatat.</p>
      </div>
      <div className="report-stat-grid">
        <article className="glass-panel report-stat"><span><FileText size={18} /> Total tagihan</span><strong>{formatRupiah(totalSales)}</strong><small>{orders.length} nota</small></article>
        <article className="glass-panel report-stat"><span><Wallet size={18} /> Sudah dibayar</span><strong>{formatRupiah(collected)}</strong><small>Jumlah pembayaran tercatat</small></article>
        <article className="glass-panel report-stat"><span><CircleDollarSign size={18} /> Komisi tercatat</span><strong>{formatRupiah(commissions)}</strong><small>Komisi sesuai kebijakan pada nota</small></article>
      </div>
      <div className="glass-panel report-table-card">
        <div className="report-table-title">
          <div><h3>Riwayat Nota Agen</h3><p>Daftar nota dengan status pembayaran saat ini.</p></div>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>No. nota</th><th>Tanggal</th><th>Pelanggan</th><th>Status</th><th className="text-right">Tagihan</th><th className="text-right">Komisi</th></tr></thead>
            <tbody>
              {orders.length ? orders.map(order => (
                <tr key={order.id}>
                  <td className="mono">{order.id}</td>
                  <td>{Number(order.createdAt) ? new Date(Number(order.createdAt)).toLocaleDateString('id-ID') : '-'}</td>
                  <td>{order.custName || '-'}</td>
                  <td><span className={`status-pill ${order.payStatus === 'Lunas' ? 'status-success' : 'status-pending'}`}>{order.payStatus || 'Belum Bayar'}</span></td>
                  <td className="text-right mono">{formatRupiah(order.total)}</td>
                  <td className="text-right mono">{formatRupiah(order.agentCommissionAmount)}</td>
                </tr>
              )) : <tr><td colSpan="6" className="empty-table">Belum ada nota yang terhubung ke agen ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
