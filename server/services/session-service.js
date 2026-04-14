const path = require('path');
const fs = require('fs');

const SESSIONS_FILE = path.join(__dirname, '../../data/sessions.json');

function loadSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return { sessions: parsed };
      }
      return parsed;
    }
  } catch (error) {
    console.error('[SessionService] 加载会话失败:', error);
  }
  return { sessions: [] };
}

function saveSessions(data) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('[SessionService] 保存会话失败:', error);
    return false;
  }
}

function getAllSessions() {
  const data = loadSessions();
  return data.sessions.map(s => ({
    id: s.id,
    title: s.title,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    tokenUsage: s.tokenUsage
  }));
}

function getSession(sessionId) {
  const data = loadSessions();
  return data.sessions.find(s => s.id === sessionId) || null;
}

function createSession(title = '新对话') {
  const data = loadSessions();
  const newSession = {
    id: 'session_' + Date.now(),
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
    tokenUsage: { prompt: 0, completion: 0, total: 0 }
  };
  data.sessions.unshift(newSession);
  saveSessions(data);
  return newSession;
}

function updateSession(sessionId, updates) {
  const data = loadSessions();
  const sessionIndex = data.sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex === -1) {
    return null;
  }

  if (updates.title !== undefined) {
    data.sessions[sessionIndex].title = updates.title;
  }
  if (updates.messages !== undefined) {
    data.sessions[sessionIndex].messages = updates.messages;
  }
  if (updates.tokenUsage !== undefined) {
    data.sessions[sessionIndex].tokenUsage = updates.tokenUsage;
  }
  data.sessions[sessionIndex].updatedAt = new Date().toISOString();

  saveSessions(data);
  return data.sessions[sessionIndex];
}

function deleteSession(sessionId) {
  const data = loadSessions();
  const sessionIndex = data.sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex === -1) {
    return false;
  }

  data.sessions.splice(sessionIndex, 1);
  saveSessions(data);
  return true;
}

function getSessionMessages(sessionId) {
  const session = getSession(sessionId);
  return session ? (session.messages || []) : [];
}

function addSessionMessage(sessionId, message) {
  const data = loadSessions();
  const session = data.sessions.find(s => s.id === sessionId);
  if (!session) {
    return false;
  }

  session.messages.push(message);

  if (message.tokenUsage) {
    session.tokenUsage = session.tokenUsage || { prompt: 0, completion: 0, total: 0 };
    session.tokenUsage.prompt += message.tokenUsage.prompt || 0;
    session.tokenUsage.completion += message.tokenUsage.completion || 0;
    session.tokenUsage.total += message.tokenUsage.total || 0;
  }

  session.updatedAt = new Date().toISOString();
  saveSessions(data);
  return true;
}

module.exports = {
  loadSessions,
  saveSessions,
  getAllSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  getSessionMessages,
  addSessionMessage
};