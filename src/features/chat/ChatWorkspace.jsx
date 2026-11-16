import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { sendChatMessage, subscribeChatMessages, listValues } from '../../firebase/client.js';

function getChannelKey(type, id) {
  return `${type}:${id}`;
}

export function ChatWorkspace({ mode, data, agent, admin }) {
  const [messages, setMessages] = useState([]);
  const [targetType, setTargetType] = useState('employee');
  const [targetId, setTargetId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const employees = useMemo(() => listValues(data?.employees), [data]);
  const agents = useMemo(() => listValues(data?.agents).filter(item => item.isActive !== false), [data]);
  const targetOptions = targetType === 'agent' ? agents : employees;
  const selectedRecipient = targetOptions.find(item => String(item.id) === String(targetId)) || targetOptions[0];
  const selectedEmployee = employees.find(item => String(item.id) === String(employeeId)) || employees[0];
  const conversation = mode === 'admin'
    ? selectedRecipient
    : mode === 'agent'
      ? agent
      : selectedEmployee;
  const conversationType = mode === 'agent' ? 'agent' : mode === 'employee' ? 'employee' : targetType;
  const conversationKey = conversation ? getChannelKey(conversationType, conversation.id) : '';
  const clientId = conversation ? `workspace-${conversationType}-${conversation.id}` : '';
  const visibleMessages = messages.filter(message => {
    if (message.conversationKey === conversationKey) return true;
    if (mode === 'admin') {
      const recipients = Array.isArray(message.recipientIds) ? message.recipientIds.map(String) : [];
      return String(message.senderClientId || '') === clientId
        || String(message.recipientClientId || '') === clientId
        || (message.senderRole !== 'admin' && recipients.includes(String(admin?.id)) && message.sender === conversation?.name)
        || (message.senderRole === 'admin' && String(message.conversationAdminId) === String(admin?.id)
          && message.recipientName === conversation?.name);
    }
    return String(message.senderClientId || '') === clientId || String(message.recipientClientId || '') === clientId;
  });

  useEffect(() => subscribeChatMessages(setMessages, error => {
    console.error('Gagal memuat pesan chat:', error);
    setError('Pesan tidak dapat dimuat. Periksa koneksi Firebase.');
  }), []);

  useEffect(() => {
    if (!clientId || mode === 'admin') return;
    localStorage.setItem('laundry_qu_pos_chat_client_id', clientId);
  }, [clientId, mode]);

  useEffect(() => {
    if (!targetOptions.length) {
      setTargetId('');
      return;
    }
    if (!targetOptions.some(item => String(item.id) === String(targetId))) {
      setTargetId(String(targetOptions[0].id));
    }
  }, [targetOptions, targetId]);

  useEffect(() => {
    if (employees.length && !employees.some(item => String(item.id) === String(employeeId))) {
      setEmployeeId(String(employees[0].id));
    }
  }, [employees, employeeId]);

  async function handleSubmit(event) {
    event.preventDefault();
    const text = draft.trim().slice(0, 500);
    if (!conversation || !text || sending) return;

    const sender = mode === 'admin' ? admin : mode === 'agent' ? agent : selectedEmployee;
    if (!sender) {
      setError('Pilih identitas pengirim terlebih dahulu.');
      return;
    }

    const senderRole = mode === 'admin' ? 'admin' : 'staff';
    const admins = listValues(data?.adminUsers);
    const senderClientId = mode === 'admin' ? 'workspace-admin' : clientId;
    setSending(true);
    setError('');
    try {
      await sendChatMessage({
        conversationKey,
        sender: sender.name,
        senderId: String(sender.id),
        senderRole,
        senderClientId,
        recipientType: mode === 'admin' ? conversationType : 'admin',
        recipientId: mode === 'admin' ? String(conversation.id) : 'all',
        recipientName: mode === 'admin' ? conversation.name : 'Admin Laundry QU',
        recipientRole: mode === 'admin' ? 'staff' : 'admin',
        ...(mode === 'admin' ? {
          recipientClientId: `workspace-${conversationType}-${conversation.id}`,
          senderAdminId: String(admin.id),
          conversationAdminId: String(admin.id)
        } : {
          recipientIds: admins.map(item => String(item.id)),
          recipientNames: admins.map(item => item.name)
        }),
        text
      });
      setDraft('');
    } catch (sendError) {
      console.error('Gagal mengirim pesan chat:', sendError);
      setError('Pesan gagal dikirim. Coba lagi setelah koneksi pulih.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="glass-panel chat-card">
      <header className="chat-header">
        <div className="chat-title-icon"><MessageCircle size={20} /></div>
        <div>
          <h2>{mode === 'admin' ? 'Inbox Admin' : 'Chat Admin'}</h2>
          <p>
            {mode === 'admin'
              ? 'Pilih karyawan atau agen untuk memulai percakapan.'
              : `Percakapan dengan Admin Laundry QU${conversation ? ` · ${conversation.name}` : ''}.`}
          </p>
        </div>
      </header>

      {mode === 'admin' && (
        <div className="chat-recipient-controls">
          <label>
            <span>Jenis penerima</span>
            <select value={targetType} onChange={event => {
              setTargetType(event.target.value);
              setTargetId('');
            }}>
              <option value="employee">Karyawan</option>
              <option value="agent">Agen</option>
            </select>
          </label>
          <label>
            <span>Nama penerima</span>
            <select value={selectedRecipient?.id || ''} onChange={event => setTargetId(event.target.value)} disabled={!targetOptions.length}>
              {targetOptions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </div>
      )}

      {mode === 'employee' && (
        <label className="chat-employee-picker">
          <span>Pengirim</span>
          <select value={selectedEmployee?.id || ''} onChange={event => setEmployeeId(event.target.value)} disabled={!employees.length}>
            {employees.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      )}

      <div className="chat-message-list" aria-live="polite">
        {!conversation ? (
          <p className="chat-empty">Belum ada {mode === 'admin' && targetType === 'agent' ? 'agen aktif' : 'karyawan'}. Tambahkan data terlebih dahulu.</p>
        ) : visibleMessages.length === 0 ? (
          <p className="chat-empty">Belum ada pesan di percakapan ini. Mulai dengan mengirim pesan.</p>
        ) : visibleMessages.map(message => {
          const ownMessage = mode === 'admin'
            ? String(message.senderAdminId || message.senderId) === String(admin?.id) && message.senderRole === 'admin'
            : String(message.senderId) === String(conversation.id) || String(message.senderClientId) === clientId;
          return (
            <article key={message.id} className={`chat-bubble ${ownMessage ? 'chat-bubble-own' : ''}`}>
              <p className="chat-sender">{message.sender || 'Pengguna'}</p>
              <p className="chat-text">{message.text}</p>
              <time>{Number(message.createdAt) ? new Date(Number(message.createdAt)).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : 'Baru saja'}</time>
            </article>
          );
        })}
      </div>

      {error && <p className="form-error" role="status">{error}</p>}
      <form className="chat-compose" onSubmit={handleSubmit}>
        <input value={draft} onChange={event => setDraft(event.target.value)} maxLength={500} placeholder="Tulis pesan..." aria-label="Isi pesan" disabled={!conversation || sending} />
        <button type="submit" className="primary-button" disabled={!conversation || !draft.trim() || sending}>
          <Send size={17} /> {sending ? 'Mengirim...' : 'Kirim'}
        </button>
      </form>
    </section>
  );
}
