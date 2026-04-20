// ── STORAGE MODULE ──
// Data via API ke server (disimpan di JSON files)
// localStorage HANYA untuk: device ID, auth user

// ── Device ID (persisten per browser) ──
function getDeviceId() {
  let id = localStorage.getItem('am_device_id');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('am_device_id', id);
  }
  return id;
}

// ── Auth User (login status) ──
function getLoggedInUser() {
  try { return JSON.parse(localStorage.getItem('am_auth_user')) || null; }
  catch { return null; }
}
function setLoggedInUser(user) {
  localStorage.setItem('am_auth_user', JSON.stringify(user));
}
function logoutUser() {
  localStorage.removeItem('am_auth_user');
}

// ── Helper fetch ──
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
}

// ════════════════════════════════════════
//  AUTH API
// ════════════════════════════════════════

async function registerAPI(username, password) {
  return apiFetch('/api/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, deviceId: getDeviceId() }),
  });
}

async function loginAPI(username, password) {
  return apiFetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

// User management (admin panel)
async function getUsers() {
  try { return await apiFetch('/api/users'); }
  catch { return []; }
}
async function updateUserRoleAPI(userId, role) {
  return apiFetch(`/api/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}
async function addAdminUserAPI(username, password, role) {
  return apiFetch('/api/admin/add-user', {
    method: 'POST',
    body: JSON.stringify({ username, password, role }),
  });
}
async function deleteUserAPI(userId) {
  return apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
}
async function updateUserAPI(userId, data) {
  return apiFetch(`/api/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

async function clearAllAPI() {
  return apiFetch('/api/admin/clear-all', { method: 'POST' });
}

// ════════════════════════════════════════
//  ACCOUNTS
// ════════════════════════════════════════

async function getAccounts() {
  try { return await apiFetch('/api/accounts'); }
  catch { return []; }
}

async function addAccountAPI(email, emailAccess, keterangan) {
  return apiFetch('/api/accounts', {
    method: 'POST',
    body: JSON.stringify({ email, emailAccess, keterangan }),
  });
}

async function deleteAccountAPI(id) {
  return apiFetch(`/api/accounts/${id}`, { method: 'DELETE' });
}

// ════════════════════════════════════════
//  HISTORY
// ════════════════════════════════════════

async function getHistory() {
  try { return await apiFetch('/api/history'); }
  catch { return []; }
}

// ════════════════════════════════════════
//  SESSIONS
// ════════════════════════════════════════

async function getSessions() {
  try { return await apiFetch('/api/sessions'); }
  catch { return []; }
}

async function deleteSessionAPI(sessionId) {
  return apiFetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
}

// ════════════════════════════════════════
//  CLAIM
// ════════════════════════════════════════

async function doClaimAPI(deviceId, userId, username) {
  return apiFetch('/api/claim', {
    method: 'POST',
    body: JSON.stringify({ deviceId, userId, username }),
  });
}

// Cek apakah device/user ini sudah claim
async function hasUserClaimed() {
  const sessions = await getSessions();
  const deviceId = getDeviceId();
  const user     = getLoggedInUser();

  if (sessions.find(s => s.sessionId === deviceId)) return true;
  if (user && sessions.find(s => s.userId === user.id)) return true;
  return false;
}

// Ambil data claim user ini
async function getUserClaim() {
  const sessions  = await getSessions();
  const deviceId  = getDeviceId();
  const user      = getLoggedInUser();

  let mySession = sessions.find(s => s.sessionId === deviceId);
  if (!mySession && user) {
    mySession = sessions.find(s => s.userId === user.id);
  }
  if (!mySession) return null;

  const accounts = await getAccounts();
  const acc = accounts.find(a => a.id === mySession.accountId);
  if (!acc) return null;

  return {
    email:       acc.email,
    emailAccess: acc.emailAccess,
    keterangan:  acc.keterangan,
    date:        mySession.date,
    id:          acc.id,
  };
}

// ════════════════════════════════════════
//  ADMIN SESSION (status login admin)
// ════════════════════════════════════════

const ADMIN_SESSION_KEY = 'am_admin_session';

function getAdminSession() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
}
function setAdminSession(val) {
  if (val) sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
  else sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

// ── Util ──
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// Cek status akses user dari server
async function checkUserAkses(userId) {
  try { return await apiFetch(`/api/users/${userId}/akses`); }
  catch { return null; }
}

// ── Maintenance ──
async function getSettingsAPI() {
  return apiFetch('/api/settings');
}
async function setMaintenanceAPI(val) {
  return apiFetch('/api/settings/maintenance', {
    method: 'POST',
    body: JSON.stringify({ maintenance: val }),
  });
}

// ── Expired user ──
async function setExpiredAPI(userId, days) {
  return apiFetch(`/api/users/${userId}/expired`, {
    method: 'PUT',
    body: JSON.stringify({ days }),
  });
}
