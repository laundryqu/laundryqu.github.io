import React from 'react';
import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Wallet } from 'lucide-react';
import { listValues } from '../../firebase/client.js';
import { formatRupiah } from './formatters.js';

function isCurrentMonth(timestamp, now) {
  const date = new Date(Number(timestamp) || 0);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export function AdminFinanceReport({ data }) {
  const now = new Date();
  const flows = listValues(data?.cashflows)
    .filter(flow => flow && !flow.isDeleted)
    .sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
  const monthlyFlows = flows.filter(flow => isCurrentMonth(flow.timestamp, now));
  const totalByType = (entries, type) => entries
    .filter(flow => flow.type === type)
    .reduce((sum, flow) => sum + (Number(flow.amount) || 0), 0);
  const income = totalByType(monthlyFlows, 'IN');
  const expenses = totalByType(monthlyFlows, 'OUT');

  return (
    <section className="report-layout">
      <div className="report-heading">
        <div className="eyebrow"><CircleDollarSign size={16} /> LAPORAN KEUANGAN</div>
        <h2>Arus kas bulan ini</h2>
        <p>Ringkasan dari transaksi masuk dan keluar yang tercatat pada kas Laundry QU.</p>
      </div>
      <div className="report-stat-grid">
        <article className="glass-panel report-stat"><span><ArrowUpRight size={18} /> Pemasukan</span><strong>{formatRupiah(income)}</strong><small>Bulan berjalan</small></article>
        <article className="glass-panel report-stat"><span><ArrowDownRight size={18} /> Pengeluaran</span><strong>{formatRupiah(expenses)}</strong><small>Bulan berjalan</small></article>
        <article className="glass-panel report-stat"><span><Wallet size={18} /> Selisih arus kas</span><strong>{formatRupiah(income - expenses)}</strong><small>Pemasukan dikurangi pengeluaran</small></article>
      </div>
      <div className="glass-panel report-table-card">
        <div className="report-table-title">
          <div><h3>Transaksi Terbaru</h3><p>Menampilkan hingga 100 catatan arus kas terbaru.</p></div>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Waktu</th><th>Keterangan</th><th>Kategori</th><th>Jenis</th><th className="text-right">Nominal</th></tr></thead>
            <tbody>
              {flows.length ? flows.slice(0, 100).map(flow => (
                <tr key={flow.id}>
                  <td>{Number(flow.timestamp) ? new Date(Number(flow.timestamp)).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                  <td>{flow.description || '-'}</td>
                  <td>{flow.category || '-'}</td>
                  <td><span className={`status-pill ${flow.type === 'IN' ? 'status-success' : 'status-pending'}`}>{flow.type === 'IN' ? 'Masuk' : 'Keluar'}</span></td>
                  <td className="text-right mono">{formatRupiah(flow.amount)}</td>
                </tr>
              )) : <tr><td colSpan="5" className="empty-table">Belum ada transaksi keuangan yang tercatat.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
