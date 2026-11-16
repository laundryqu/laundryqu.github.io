import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight, BadgeDollarSign, Boxes, ChartNoAxesCombined, CircleUserRound,
  ClipboardList, LogOut, MessageCircle, QrCode, Settings2, Shirt,
  Sparkles, Users, Wallet
} from 'lucide-react';
import { AgentFinanceReport } from '../agent/AgentFinanceReport.jsx';
import { ChatWorkspace } from '../chat/ChatWorkspace.jsx';
import { AdminFinanceReport } from './AdminFinanceReport.jsx';
import { listValues, subscribeLaundryData } from '../../firebase/client.js';
import { formatRupiah } from './formatters.js';

const WORKSPACES = {
  pos: {
    name: 'Kasir',
    heading: 'POS Laundry',
    description: 'Operasional kasir, cucian, dan pelanggan dalam satu tempat.',
    navigation: [
      { id: 'kasir', label: 'Buat Nota', icon: ClipboardList, legacyTab: 'kasir' },
      { id: 'progres', label: 'Alur Progres Cucian', icon: Shirt, legacyTab: 'progres' },
      { id: 'pelunasan', label: 'Pelunasan & Scan', icon: QrCode, legacyTab: 'pelunasan' },
      { id: 'laporan', label: 'Laporan Harian Kasir', icon: ChartNoAxesCombined, legacyTab: 'laporanharian' },
      { id: 'member', label: 'Member & Portal QR', icon: CircleUserRound, legacyTab: 'member' },
      { id: 'stok', label: 'Stok & Pengeluaran', icon: Boxes, legacyTab: 'stok' },
      { id: 'chat', label: 'Chat Admin', icon: MessageCircle }
    ]
  },
  admin: {
    name: 'Admin',
    heading: 'Pusat Kendali',
    description: 'Kelola tim, pengaturan, dan kinerja keuangan Laundry QU.',
    navigation: [
      { id: 'karyawan', label: 'Data Karyawan', icon: Users, legacyTab: 'karyawan' },
      { id: 'agen', label: 'Agen Laundry', icon: CircleUserRound, legacyTab: 'agen' },
      { id: 'gaji', label: 'Keuangan & Gaji', icon: Wallet, legacyTab: 'keuangan' },
      { id: 'pengaturan', label: 'Pengaturan & Paket', icon: Settings2, legacyTab: 'setting' },
      { id: 'laporan', label: 'Laporan Keuangan', icon: ChartNoAxesCombined },
      { id: 'inbox', label: 'Inbox Admin', icon: MessageCircle }
    ]
  },
  agen: {
    name: 'Agen',
    heading: 'Portal Mitra',
    description: 'Kelola nota yang dibawa dan pantau pendapatan agen.',
    navigation: [
      { id: 'dashboard', label: 'Dasbor Agen Laundry', icon: Sparkles, legacyTab: 'kasir' },
      { id: 'nota', label: 'Buat Nota', icon: ClipboardList, legacyTab: 'kasir' },
      { id: 'keuangan', label: 'Laporan Keuangan Agen', icon: BadgeDollarSign },
      { id: 'chat', label: 'Chat Admin', icon: MessageCircle }
    ]
  }
};

function LegacyFrame({ workspace, activeTab, agent }) {
  const frameRef = useRef(null);
  const [ready, setReady] = useState(false);
  const navigationItem = WORKSPACES[workspace].navigation.find(item => item.id === activeTab);

  useEffect(() => {
    if (!ready || !navigationItem?.legacyTab || !frameRef.current?.contentWindow) return;
    frameRef.current.contentWindow.postMessage({
      type: 'laundry:workspace',
      role: workspace,
      tab: navigationItem.legacyTab,
      agentId: agent?.id || null,
      agentName: agent?.name || null,
      adminName: workspace === 'admin' ? agent?.name : null
    }, window.location.origin);
  }, [ready, workspace, navigationItem, agent]);

  return (
    <motion.div className="legacy-frame-wrap glass-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
      <iframe
        ref={frameRef}
        className="legacy-frame"
        src="/PosLaundry.html?embedded=1"
        title={`${WORKSPACES[workspace].name} Laundry QU`}
        onLoad={() => setReady(true)}
      />
      {!ready && <div className="frame-loading"><span className="loading-orb" /> Memuat modul operasional...</div>}
    </motion.div>
  );
}

function LoginGate({ mode, data, onLogin, dataReady, loadError }) {
  const [password, setPassword] = useState('');
  const [agentId, setAgentId] = useState('');
  const [error, setError] = useState('');
  const agents = useMemo(() => listValues(data?.agents).filter(agent => agent.isActive !== false), [data]);

  useEffect(() => {
    if (agents.length && !agents.some(agent => String(agent.id) === agentId)) {
      setAgentId(String(agents[0].id));
    }
  }, [agents, agentId]);

  function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!dataReady) {
      setError('Data login belum siap. Periksa koneksi lalu coba kembali.');
      return;
    }
    if (mode === 'admin') {
      const enteredPassword = password.trim();
      const user = listValues(data?.adminUsers).find(item => String(item.password) === enteredPassword);
      const masterPassword = String(data?.settings?.adminPassword || '1234');
      if (user) {
        onLogin({ id: String(user.id), name: user.name, role: 'admin' });
      } else if (enteredPassword && enteredPassword === masterPassword) {
        onLogin({ id: 'master-admin', name: 'Master Admin', role: 'admin' });
      } else {
        setError('Password admin tidak cocok.');
      }
      return;
    }

    const selectedAgent = agents.find(agent => String(agent.id) === String(agentId));
    if (!selectedAgent) {
      setError('Tidak ada agen aktif yang tersedia.');
      return;
    }
    onLogin({ ...selectedAgent, id: String(selectedAgent.id), role: 'agent' });
  }

  return (
    <main className="login-screen">
      <motion.section className="glass-panel login-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <div className="login-brand"><span className="brand-mark"><Shirt size={22} /></span><span>LAUNDRY <b>QU</b></span></div>
        <div className="eyebrow"><Sparkles size={15} /> WORKSPACE {mode === 'admin' ? 'ADMIN' : 'AGEN'}</div>
        <h1>{mode === 'admin' ? 'Selamat datang kembali' : 'Masuk ke portal agen'}</h1>
        <p className="login-description">
          {mode === 'admin'
            ? 'Masukkan password admin yang sudah diatur di sistem Laundry QU.'
            : 'Pilih nama agen untuk membuka dasbor dan laporan Anda.'}
        </p>
        {loadError && <p className="form-error" role="status">{loadError}</p>}
        {mode === 'agen' && dataReady && !agents.length && (
          <p className="login-notice" role="status">Belum ada agen aktif. Admin perlu menambahkan agen melalui workspace admin.</p>
        )}
        <form className="login-form" onSubmit={handleSubmit}>
          {mode === 'admin' ? (
            <label>
              <span>Password Admin</span>
              <input autoFocus type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Masukkan password" required />
            </label>
          ) : (
            <label>
              <span>Nama Agen</span>
              <select value={agentId} onChange={event => setAgentId(event.target.value)} disabled={!agents.length || !dataReady}>
                {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </select>
            </label>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="primary-button login-submit" disabled={!dataReady || (mode === 'agen' && !agents.length)}>
            {mode === 'admin' ? 'Masuk sebagai admin' : 'Masuk sebagai agen'} <ArrowUpRight size={17} />
          </button>
        </form>
        <p className="login-footnote">{dataReady ? 'Koneksi data siap' : 'Menghubungkan ke data Laundry QU...'}</p>
      </motion.section>
    </main>
  );
}

function WelcomePanel({ workspace, agent, data }) {
  const orders = listValues(data?.orders).filter(order => !order.isDeleted);
  const agentOrders = orders.filter(order => String(order.agentId) === String(agent?.id));

  if (workspace !== 'agen') return null;
  return (
    <motion.section className="welcome-panel glass-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <div className="eyebrow"><Sparkles size={15} /> MITRA LAUNDRY QU</div>
        <h2>Halo, {agent?.name || 'Agen'}.</h2>
        <p>Ini ringkasan aktivitas nota Anda yang tercatat di sistem.</p>
      </div>
      <div className="welcome-metrics">
        <div><span>Nota agen</span><strong>{agentOrders.length}</strong></div>
        <div><span>Nota hari ini</span><strong>{agentOrders.filter(order => new Date(Number(order.createdAt) || 0).toDateString() === new Date().toDateString()).length}</strong></div>
        <div><span>Tagihan tercatat</span><strong>{formatRupiah(agentOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0))}</strong></div>
      </div>
      <span className="welcome-glow" aria-hidden="true" />
    </motion.section>
  );
}

function ActiveWorkspace({ workspace, activeTab, data, session }) {
  if (activeTab === 'chat' || activeTab === 'inbox') {
    return <ChatWorkspace mode={workspace === 'admin' ? 'admin' : workspace === 'agen' ? 'agent' : 'employee'} data={data} agent={session} admin={session} />;
  }
  if (workspace === 'admin' && activeTab === 'laporan') {
    return <AdminFinanceReport data={data} />;
  }
  if (workspace === 'agen' && activeTab === 'keuangan') {
    return <AgentFinanceReport data={data} agent={session} />;
  }
  return <LegacyFrame workspace={workspace} activeTab={activeTab} agent={session} />;
}

export function WorkspaceApp({ workspace }) {
  const config = WORKSPACES[workspace] || WORKSPACES.pos;
  const [data, setData] = useState({});
  const [dataReady, setDataReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [session, setSession] = useState(workspace === 'pos' ? { role: 'pos', id: 'pos', name: 'Kasir' } : null);
  const [activeTab, setActiveTab] = useState(config.navigation[0].id);

  useEffect(() => subscribeLaundryData(remoteData => {
    setData(remoteData);
    setDataReady(true);
    setLoadError('');
  }, error => {
    console.error('Gagal memuat data Laundry QU:', error);
    setDataReady(true);
    setLoadError('Data tidak dapat dimuat dari Firebase.');
  }), []);

  const activeNavigation = config.navigation.find(item => item.id === activeTab) || config.navigation[0];
  const showWelcome = workspace === 'agen' && activeTab === 'dashboard';
  const activeIsLegacy = Boolean(activeNavigation.legacyTab);

  if (workspace !== 'pos' && !session) {
    return <LoginGate mode={workspace} data={data} dataReady={dataReady && !loadError} loadError={loadError} onLogin={user => {
      setSession(user);
      setActiveTab(config.navigation[0].id);
    }} />;
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar glass-panel">
        <a className="brand-link" href={workspace === 'agen' ? '/agen.html' : workspace === 'admin' ? '/admin.html' : '/pos.html'}>
          <span className="brand-mark"><Shirt size={21} /></span>
          <span><b>LAUNDRY QU</b><small>{config.name} workspace</small></span>
        </a>
        <div className="sidebar-caption">WORKSPACE</div>
        <nav className="workspace-nav" aria-label="Navigasi workspace">
          {config.navigation.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" className={`nav-item ${activeTab === item.id ? 'nav-item-active' : ''}`} onClick={() => setActiveTab(item.id)}>
                <Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>
                {activeTab === item.id && <span className="active-dot" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection-indicator"><span className={`connection-dot ${dataReady && !loadError ? 'is-online' : ''}`} /><span>{loadError ? 'Periksa koneksi' : dataReady ? 'Terhubung' : 'Menghubungkan...'}</span></div>
          {workspace !== 'pos' && <button type="button" className="logout-button" onClick={() => setSession(null)}><LogOut size={16} /> Keluar</button>}
        </div>
      </aside>

      <main className="workspace-main">
        <header className="workspace-topbar">
          <div>
            <div className="topbar-overline">{config.name} <span>/</span> {activeNavigation.label}</div>
            <h1>{config.heading}</h1>
          </div>
          <div className="user-chip">
            <span className="user-avatar">{session?.name?.slice(0, 1)?.toUpperCase() || 'Q'}</span>
            <span><b>{session?.name || 'Kasir'}</b><small>{workspace === 'admin' ? 'Administrator' : workspace === 'agen' ? 'Mitra Laundry' : 'Kasir'}</small></span>
          </div>
        </header>

        {showWelcome && <WelcomePanel workspace={workspace} agent={session} data={data} />}
        {activeIsLegacy ? (
          <section className="workspace-content">
            {!showWelcome && <p className="workspace-subtitle">{config.description}</p>}
            <LegacyFrame workspace={workspace} activeTab={activeTab} agent={session} />
          </section>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.section key={activeTab} className="workspace-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.22 }}>
              <p className="workspace-subtitle">{config.description}</p>
              <ActiveWorkspace workspace={workspace} activeTab={activeTab} data={data} session={session} />
            </motion.section>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
