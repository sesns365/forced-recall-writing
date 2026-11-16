// 本機紀錄：存在這台裝置的 localStorage，不需登入、不存姓名（只用代號）。
const KEY = 'forced-recall:v1';
const UNEXPORTED_KEY = 'forced-recall:unexported';
const EXPORTED_AT_KEY = 'forced-recall:exportedAt';
export const CHANGED_EVENT = 'forced-recall:changed';

export function loadRecords() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
      retention: Array.isArray(raw.retention) ? raw.retention : [],
    };
  } catch {
    return { sessions: [], retention: [] };
  }
}

function write(records) {
  localStorage.setItem(KEY, JSON.stringify(records));
}

function notify() {
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

// 未匯出的筆數：每存一字或一筆保留測驗就加 1，匯出後歸零。
export function getUnexported() {
  return Number(localStorage.getItem(UNEXPORTED_KEY) || 0);
}

export function getExportedAt() {
  return localStorage.getItem(EXPORTED_AT_KEY) || '';
}

export function markExported() {
  localStorage.setItem(UNEXPORTED_KEY, '0');
  localStorage.setItem(EXPORTED_AT_KEY, new Date().toISOString());
  notify();
}

// 儲存空間不足時會丟出例外，由呼叫端顯示訊息。
export function addSession(session) {
  const records = loadRecords();
  records.sessions.unshift(session);
  write(records);
  localStorage.setItem(UNEXPORTED_KEY, String(getUnexported() + 1));
  notify();
  return records;
}

export function addRetention(item) {
  const records = loadRecords();
  records.retention.unshift(item);
  write(records);
  localStorage.setItem(UNEXPORTED_KEY, String(getUnexported() + 1));
  notify();
  return records;
}

// 老師批改：更新一筆測驗紀錄（例如填入 ○ △ × 空白）。
export function updateRetention(id, patch) {
  const records = loadRecords();
  records.retention = records.retention.map((r) => (r.id === id ? { ...r, ...patch } : r));
  write(records);
  notify();
  return records;
}

// 進行中的測驗：存在本機，重新整理網頁也會回到測驗畫面，學生無法藉此跳回練習。
const ACTIVE_TEST_KEY = 'forced-recall:activeTest';

export function getActiveTest() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_TEST_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setActiveTest(test) {
  if (test) localStorage.setItem(ACTIVE_TEST_KEY, JSON.stringify(test));
  else localStorage.removeItem(ACTIVE_TEST_KEY);
}
