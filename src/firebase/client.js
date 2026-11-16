import { getApps, initializeApp } from '@firebase/app';
import { getDatabase, limitToLast, onValue, push, query, ref, set } from '@firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyDsExL72DMNTQiN_MoaE1fVvdlj5sghn7c',
  authDomain: 'laundry-24475.firebaseapp.com',
  projectId: 'laundry-24475',
  databaseURL: 'https://laundry-24475-default-rtdb.asia-southeast1.firebasedatabase.app/',
  storageBucket: 'laundry-24475.firebasestorage.app',
  messagingSenderId: '568171815369',
  appId: '1:568171815369:web:1a06bb73de0b0a46004818',
  measurementId: 'G-JH9NX549K5'
};

const appName = 'LaundryQUWorkspaces';
const firebaseApp = getApps().find(app => app.name === appName)
  || initializeApp(firebaseConfig, appName);
const database = getDatabase(firebaseApp);
const laundryDataRef = ref(database, 'laundry_qu_pos');
const chatMessagesRef = ref(database, 'laundry_qu_pos_chat');

export function listValues(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item, index) => item && ({ ...item, id: item.id ?? String(index) })).filter(Boolean);
  }
  return Object.entries(value)
    .map(([id, item]) => item && ({ ...item, id: item.id ?? id }))
    .filter(Boolean);
}

export function subscribeLaundryData(onData, onError) {
  return onValue(laundryDataRef, snapshot => onData(snapshot.val() || {}), onError);
}

export function subscribeChatMessages(onData, onError) {
  return onValue(query(chatMessagesRef, limitToLast(300)), snapshot => {
    const messages = Object.entries(snapshot.val() || {})
      .filter(([, message]) => message && typeof message.text === 'string')
      .map(([id, message]) => ({ id, ...message }))
      .sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0))
      .slice(-300);
    onData(messages);
  }, onError);
}

export function sendChatMessage(message) {
  return set(push(chatMessagesRef), {
    ...message,
    createdAt: Date.now()
  });
}
