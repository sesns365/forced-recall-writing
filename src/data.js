// 資料讀取（只在瀏覽器執行）。
// 單一 HTML 版：資料以 gzip＋base64 內嵌在 <script id="emb-…"> 中，離線也能用。
// 開發版：沒有內嵌資料時，從 public/ 抓取。
import { normalizeLessons } from './logic.js';

const BASE = import.meta.env.BASE_URL;

export function base64Bytes(text) {
  const binary = atob(text.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function gunzipJson(id) {
  const el = document.getElementById(id);
  if (!el) return undefined;
  const stream = new Blob([base64Bytes(el.textContent)]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}

async function getJson(path) {
  const response = await fetch(BASE + path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`讀取 ${path} 失敗`);
  return response.json();
}

export async function loadLessons() {
  return normalizeLessons((await gunzipJson('emb-lessons')) ?? (await getJson('data/lessons.json')));
}

// 部件與口訣：單一 HTML 版放在 <script id="emb-parts" type="application/json">，老師可用文字編輯器修改。
export async function loadParts() {
  const el = document.getElementById('emb-parts');
  if (el) return JSON.parse(el.textContent || '{}');
  return getJson('data/parts.json');
}

let embeddedStrokes;
const strokeCache = new Map();

export function loadStrokes(char) {
  if (strokeCache.has(char)) return strokeCache.get(char);
  const pending = (async () => {
    if (document.getElementById('emb-strokes')) {
      embeddedStrokes ??= gunzipJson('emb-strokes');
      const all = await embeddedStrokes;
      if (!all[char]) throw new Error('沒有這個字的筆順資料');
      return all[char];
    }
    const hex = char.codePointAt(0).toString(16).toUpperCase();
    const data = await getJson(`strokes/${hex}.json`);
    if (!Array.isArray(data.strokes) || !data.strokes.length) throw new Error('筆順資料格式不正確');
    return data;
  })();
  strokeCache.set(char, pending);
  pending.catch(() => strokeCache.delete(char));
  return pending;
}
