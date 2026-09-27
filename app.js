const STORAGE_KEY = 'bluetooth-chat-rooms-v1';
const CHANNEL_NAME = 'bluetooth-chat-sync';
const state = { rooms: loadRooms(), currentRoomId: null, currentUser: '' };

const $ = (id) => document.getElementById(id);
const userNameInput = $('userName');
const joinRoomIdInput = $('joinRoomId');
const currentRoomLabel = $('currentRoomLabel');
const roomList = $('roomList');
const messagesEl = $('messages');
const statusEl = $('status');
const messageForm = $('messageForm');
const messageInput = $('messageInput');
const broadcastChannel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null;

function getId() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }
function makeRoomId() { return `ROOM-${getId()}`; }
function loadRooms() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch (error) { console.warn('保存データを読み込めません:', error); return {}; }
}
function persistRooms() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.rooms));
  if (broadcastChannel) broadcastChannel.postMessage({ type: 'rooms-update', rooms: state.rooms });
}
function updateStatus(text) { statusEl.textContent = text; }
function normalizeUserName(value) { return (value || '').trim() || 'ゲスト'; }
function formatTime(timestamp) { return new Date(timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }); }
function newMessage(author, text, type = 'system') {
  return { id: crypto.randomUUID(), author, text, timestamp: new Date().toISOString(), type };
}
function setRoom(roomId) {
  state.currentRoomId = roomId;
  currentRoomLabel.textContent = roomId;
  joinRoomIdInput.value = roomId;
  renderRoomList(); renderMessages();
}
function createRoom() {
  const roomId = makeRoomId();
  state.currentUser = normalizeUserName(userNameInput.value);
  state.rooms[roomId] = { id: roomId, members: [state.currentUser], createdAt: Date.now(), messages: [newMessage('システム', `${state.currentUser}さんがルームを作成しました。`)] };
  persistRooms(); setRoom(roomId);
  updateStatus(`ルームID「${roomId}」を作成しました。別のタブでは同じIDを入力してください。`);
  messageInput.focus();
}
function joinRoom() {
  const roomId = joinRoomIdInput.value.trim().toUpperCase();
  state.currentUser = normalizeUserName(userNameInput.value);
  if (!roomId) return updateStatus('参加するルームIDを入力してください。');
  const room = state.rooms[roomId];
  if (!room) return updateStatus('そのルームは見つかりません。作成したPCの別タブで試してください。');
  if (!room.members.includes(state.currentUser)) room.members.push(state.currentUser);
  room.messages.push(newMessage('システム', `${state.currentUser}さんが参加しました。`));
  persistRooms(); setRoom(roomId); updateStatus(`「${roomId}」に参加しました。`); messageInput.focus();
}
function deleteCurrentRoom() {
  if (!state.currentRoomId) return updateStatus('削除するルームがありません。');
  if (!window.confirm(`「${state.currentRoomId}」を削除しますか？`)) return;
  delete state.rooms[state.currentRoomId]; state.currentRoomId = null;
  currentRoomLabel.textContent = 'ルーム未選択'; joinRoomIdInput.value = ''; messagesEl.innerHTML = '';
  persistRooms(); renderRoomList(); updateStatus('ルームを削除しました。');
}
function renderRoomList() {
  roomList.innerHTML = '';
  const ids = Object.keys(state.rooms).sort();
  if (!ids.length) { const li = document.createElement('li'); li.textContent = 'ルームはまだありません'; li.style.cursor = 'default'; roomList.appendChild(li); return; }
  ids.forEach((roomId) => { const li = document.createElement('li'); li.textContent = roomId; li.addEventListener('click', () => { setRoom(roomId); updateStatus(`「${roomId}」を表示しています。`); }); roomList.appendChild(li); });
}
function renderMessages() {
  const room = state.currentRoomId ? state.rooms[state.currentRoomId] : null;
  messagesEl.innerHTML = '';
  if (!room) return;
  room.messages.forEach((message) => {
    const item = document.createElement('div');
    item.className = `message ${message.type === 'system' ? 'system' : message.author === state.currentUser ? 'self' : 'other'}`;
    if (message.type !== 'system') { const meta = document.createElement('span'); meta.className = 'message-meta'; meta.textContent = `${message.author}  ${formatTime(message.timestamp)}`; item.appendChild(meta); }
    const text = document.createElement('div'); text.textContent = message.text; item.appendChild(text); messagesEl.appendChild(item);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
function sendMessage(event) {
  event.preventDefault();
  if (!state.currentRoomId) return updateStatus('先にルームを作成または参加してください。');
  const text = messageInput.value.trim(); if (!text) return;
  state.rooms[state.currentRoomId].messages.push(newMessage(state.currentUser || 'ゲスト', text, 'chat'));
  persistRooms(); renderMessages(); messageInput.value = ''; messageInput.focus();
}
function handleExternalUpdate(event) {
  if (event.data?.type !== 'rooms-update') return;
  state.rooms = event.data.rooms || {};
  if (state.currentRoomId && !state.rooms[state.currentRoomId]) { state.currentRoomId = null; currentRoomLabel.textContent = 'ルーム未選択'; messagesEl.innerHTML = ''; }
  renderRoomList(); renderMessages();
}

$('createRoomBtn').addEventListener('click', createRoom);
$('joinRoomBtn').addEventListener('click', joinRoom);
$('deleteRoomBtn').addEventListener('click', deleteCurrentRoom);
messageForm.addEventListener('submit', sendMessage);
joinRoomIdInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') joinRoom(); });
if (broadcastChannel) broadcastChannel.addEventListener('message', handleExternalUpdate);
window.addEventListener('storage', (event) => { if (event.key === STORAGE_KEY && event.newValue) { state.rooms = JSON.parse(event.newValue); renderRoomList(); renderMessages(); } });
renderRoomList(); renderMessages();
