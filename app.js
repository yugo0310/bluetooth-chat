const STORAGE_KEY = 'bluetooth-chat-rooms-v1';
const CHANNEL_NAME = 'bluetooth-chat-sync';

const state = {
  rooms: loadRooms(),
  currentRoomId: null,
  currentUser: ''
};

const userNameInput = document.getElementById('userName');
const joinRoomIdInput = document.getElementById('joinRoomId');
const currentRoomLabel = document.getElementById('currentRoomLabel');
const roomList = document.getElementById('roomList');
const messagesEl = document.getElementById('messages');
const statusEl = document.getElementById('status');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const deleteRoomBtn = document.getElementById('deleteRoomBtn');
const broadcastChannel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null;

function getId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function makeRoomId() {
  return `ROOM-${getId()}`;
}

function loadRooms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('Failed to load rooms:', error);
    return {};
  }
}

function persistRooms() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.rooms));
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'rooms-update', rooms: state.rooms });
  }
}

function updateStatus(text) {
  statusEl.textContent = text;
}

function normalizeUserName(rawName) {
  return (rawName || '').trim() || 'Guest';
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function createSystemMessage(text) {
  return {
    id: crypto.randomUUID(),
    author: 'System',
    text,
    timestamp: new Date().toISOString(),
    type: 'system'
  };
}

function setRoom(roomId) {
  state.currentRoomId = roomId;
  currentRoomLabel.textContent = roomId;
  joinRoomIdInput.value = roomId;
  renderMessages();
  renderRoomList();
}

function createRoom() {
  const roomId = makeRoomId();
  const userName = normalizeUserName(userNameInput.value);

  state.currentUser = userName;
  state.rooms[roomId] = {
    id: roomId,
    members: [userName],
    createdAt: Date.now(),
    messages: [createSystemMessage(`${userName} created room ${roomId}.`)]
  };

  persistRooms();
  setRoom(roomId);
  updateStatus(`Room created: ${roomId}. Share this ID with other participants.`);
  messageInput.focus();
}

function joinRoom() {
  const roomId = joinRoomIdInput.value.trim().toUpperCase();
  const userName = normalizeUserName(userNameInput.value);

  if (!roomId) {
    updateStatus('Please enter a room ID to join.');
    return;
  }

  const room = state.rooms[roomId];
  if (!room) {
    updateStatus(`Room ${roomId} does not exist yet.`);
    return;
  }

  state.currentUser = userName;
  if (!room.members.includes(userName)) {
    room.members.push(userName);
  }

  room.messages.push(createSystemMessage(`${userName} joined the room.`));
  persistRooms();
  setRoom(roomId);
  updateStatus(`Joined room ${roomId}.`);
  messageInput.focus();
}

function deleteCurrentRoom() {
  if (!state.currentRoomId) {
    updateStatus('There is no room to delete.');
    return;
  }

  const roomId = state.currentRoomId;
  const confirmed = window.confirm(`Delete room ${roomId}? This cannot be undone.`);
  if (!confirmed) {
    return;
  }

  delete state.rooms[roomId];
  state.currentRoomId = null;
  currentRoomLabel.textContent = 'No room joined';
  messagesEl.innerHTML = '';
  joinRoomIdInput.value = '';
  persistRooms();
  renderRoomList();
  updateStatus('Room deleted. Create a new room or join another one.');
}

function renderRoomList() {
  const ids = Object.keys(state.rooms).sort();
  roomList.innerHTML = '';

  if (!ids.length) {
    const item = document.createElement('li');
    item.textContent = 'No rooms yet';
    roomList.appendChild(item);
    return;
  }

  ids.forEach((roomId) => {
    const item = document.createElement('li');
    item.textContent = roomId;
    item.addEventListener('click', () => {
      setRoom(roomId);
      updateStatus(`Selected room ${roomId}.`);
    });
    roomList.appendChild(item);
  });
}

function renderMessages() {
  const room = state.currentRoomId ? state.rooms[state.currentRoomId] : null;
  messagesEl.innerHTML = '';

  if (!room) {
    return;
  }

  room.messages.forEach((message) => {
    const item = document.createElement('div');
    item.className = `message ${message.type === 'system' ? 'system' : message.author === state.currentUser ? 'self' : 'other'}`;

    if (message.type !== 'system') {
      const meta = document.createElement('span');
      meta.className = 'message-meta';
      meta.textContent = `${message.author} • ${formatTime(message.timestamp)}`;
      item.appendChild(meta);
    }

    const text = document.createElement('div');
    text.textContent = message.text;
    item.appendChild(text);

    messagesEl.appendChild(item);
  });

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function sendMessage(event) {
  event.preventDefault();

  if (!state.currentRoomId) {
    updateStatus('Create or join a room before sending a message.');
    return;
  }

  const text = messageInput.value.trim();
  if (!text) {
    return;
  }

  const room = state.rooms[state.currentRoomId];
  room.messages.push({
    id: crypto.randomUUID(),
    author: state.currentUser || 'Guest',
    text,
    timestamp: new Date().toISOString(),
    type: 'chat'
  });

  persistRooms();
  renderMessages();
  messageInput.value = '';
}

function handleExternalUpdate(event) {
  if (event.data && event.data.type === 'rooms-update') {
    state.rooms = event.data.rooms || {};
    if (state.currentRoomId && !state.rooms[state.currentRoomId]) {
      state.currentRoomId = null;
      currentRoomLabel.textContent = 'No room joined';
      messagesEl.innerHTML = '';
    }
    renderRoomList();
    renderMessages();
  }
}

createRoomBtn.addEventListener('click', createRoom);
joinRoomBtn.addEventListener('click', joinRoom);
deleteRoomBtn.addEventListener('click', deleteCurrentRoom);
messageForm.addEventListener('submit', sendMessage);

if (broadcastChannel) {
  broadcastChannel.addEventListener('message', handleExternalUpdate);
}

window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY && event.newValue) {
    state.rooms = JSON.parse(event.newValue);
    renderRoomList();
    renderMessages();
  }
});

renderRoomList();
renderMessages();
