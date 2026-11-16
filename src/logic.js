// 純邏輯：不依賴瀏覽器與 import.meta，方便用 node --test 測試。

export const ATTEMPTS = 4;
export const OBSERVE_SECONDS = 5;
// 每累積這麼多筆未匯出的紀錄，就提醒老師匯出備份。
export const EXPORT_REMIND_EVERY = 5;
export const CSV_HEADER = 'type,at,code,lesson,char,word,detail1,detail2,detail3,detail4';
export const DELAYS = [
  ['immediate', '立即'],
  ['week1', '一週後'],
  ['week2', '兩週後'],
];

// 目標字：語詞中第 targetIdx 個字。
export function targetOf(entry) {
  return Array.from(entry.word)[entry.targetIdx];
}

// 目標字的注音：語詞注音以空白分隔，數量與字數相同時取第 targetIdx 個；否則回傳 null。
export function zhuyinOf(entry) {
  const parts = entry.pinyin.trim().split(/\s+/);
  const chars = Array.from(entry.word);
  return parts.length === chars.length ? parts[entry.targetIdx] : null;
}

// 例句：fill=true 時把挖空處填入目標字（教學階段）；false 時以「＿＿」遮住（回想階段）。
export function sentenceText(entry, fill) {
  const replacement = fill ? targetOf(entry) : '＿＿';
  return entry.sentence.replace(/\[\s*\]/, replacement);
}

// 語詞遮字：目標字換成「□」，回想階段使用。
export function maskedWord(entry) {
  return Array.from(entry.word)
    .map((c, i) => (i === entry.targetIdx ? '□' : c))
    .join('');
}

// 取出某字的部件設定（老師在 parts.json 逐字輸入）；沒有就回傳 null。
export function partsFor(parts, char) {
  const list = parts?.[char]?.parts;
  return Array.isArray(list) && list.length ? list : null;
}

// 檢查部件是否涵蓋全部筆畫：每一筆都要恰好屬於一個部件。
export function checkCoverage(partList, strokeCount) {
  const seen = new Array(strokeCount).fill(0);
  for (const part of partList) {
    for (const i of part.strokes) {
      if (Number.isInteger(i) && i >= 0 && i < strokeCount) seen[i] += 1;
    }
  }
  const missing = [];
  const duplicated = [];
  seen.forEach((n, i) => {
    if (n === 0) missing.push(i);
    if (n > 1) duplicated.push(i);
  });
  return { missing, duplicated };
}

// 拆部件塗色檢查：mapping[i] 是第 i 筆塗的部件編號（-1 為未塗）。
// 同名部件（如「協」的三個「力」）可以互換，只要每一組筆畫正確即可。
// 回傳 { done, wrong }：wrong 是塗錯（或未塗）的筆畫編號。
export function checkPaint(mapping, partList) {
  const sameSet = (a, b) => a.length === b.length && a.every((v) => b.includes(v));
  const wrong = new Set();
  mapping.forEach((g, i) => {
    if (g < 0) { wrong.add(i); return; } // 沒塗
    const label = partList[g].label;
    if (!partList.some((p) => p.label === label && p.strokes.includes(i))) wrong.add(i); // 塗成別的部件
  });
  // 每一組都要剛好是一個正確部件（同名部件可以互換，但不能重複配對）
  const used = new Set();
  const inexact = [];
  partList.forEach((p, g) => {
    const mine = mapping.map((v, i) => (v === g ? i : -1)).filter((i) => i >= 0);
    const match = partList.findIndex((q, k) => !used.has(k) && q.label === p.label && sameSet(q.strokes, mine));
    if (match >= 0) used.add(match); else inexact.push(...mine);
  });
  if (wrong.size === 0) inexact.forEach((i) => wrong.add(i));
  return { done: wrong.size === 0, wrong: [...wrong].sort((a, b) => a - b) };
}

export function lessonLabel(lesson) {
  return lesson.label ?? `${lesson.bookId} 第${lesson.number}課 ${lesson.title}`;
}

// 保留測驗的計分（依評量紀錄表）：○ 正確、△ 部分正確、× 錯誤、空白。只有 ○ 計 1 分。
export const RESULTS = [
  ['correct', '○ 正確'],
  ['partial', '△ 部分正確'],
  ['wrong', '× 錯誤'],
  ['blank', '空白'],
];

// 教材檔可以是課次陣列（全部教材），或 { practice, retention }（行動方案）。
export function normalizeLessons(data) {
  return Array.isArray(data) ? { practice: data, retention: data } : data;
}

// 實際間隔天數：這台裝置最近一次練這個字（在測驗之前）到測驗時，相隔幾天。
export function intervalDays(sessions, char, at) {
  const t = Date.parse(at);
  const times = sessions.filter((s) => s.char === char && Date.parse(s.at) <= t).map((s) => Date.parse(s.at));
  if (!times.length) return null;
  return Math.floor((t - Math.max(...times)) / 86400000);
}

// 報讀口訣時把「＋」唸成「加」。
export function speakableMnemonic(text) {
  return text.replace(/[＋+]/g, '加');
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// 把 data:image/png;base64 字串轉成位元組。
export function dataUrlBytes(dataUrl) {
  const binary = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// 匯出內容：records.csv 加上每一遍的字跡 PNG（檔名含代號、字、第幾遍）。
export function exportFiles(records) {
  const encoder = new TextEncoder();
  const files = [{ name: 'records.csv', data: encoder.encode(toCsv(records)) }];
  const seatOf = (seat) => `代號${seat || '未填'}`;
  records.sessions.forEach((s, si) => {
    s.attempts.forEach((a, i) => {
      if (a.png) {
        files.push({
          name: `強制回憶/${seatOf(s.seat)}_${s.char}_${si + 1}_第${i + 1}遍.png`,
          data: dataUrlBytes(a.png),
        });
      }
    });
    if (s.correction) {
      files.push({ name: `強制回憶/${seatOf(s.seat)}_${s.char}_${si + 1}_訂正.png`, data: dataUrlBytes(s.correction) });
    }
  });
  records.retention.forEach((r, ri) => {
    if (r.png) {
      files.push({
        name: `保留測驗/${seatOf(r.seat)}_${r.char}_${r.delay}_${ri + 1}.png`,
        data: dataUrlBytes(r.png),
      });
    }
  });
  return files;
}

// 合併多台裝置的匯出（每個輸入是一份 exportFiles 的結果）。
// 文字紀錄依整行去除重複（同一台裝置重複匯出時不會重複計算）；
// 字跡依檔名去除重複，並改放到「代號/強制回憶或保留測驗/」資料夾。
export function mergeExports(exportLists) {
  const decoder = new TextDecoder('utf-8');
  const seenRows = new Set();
  const rows = [];
  const seenImages = new Set();
  const images = [];
  for (const files of exportLists) {
    for (const file of files) {
      if (file.name === 'records.csv') {
        const text = decoder.decode(file.data).replace(/^﻿/, '');
        for (const line of text.split('\n')) {
          if (!line || line === CSV_HEADER) continue;
          if (!seenRows.has(line)) {
            seenRows.add(line);
            rows.push(line);
          }
        }
        continue;
      }
      const match = /^(強制回憶|保留測驗)\/(代號[^_]*)_(.+)$/.exec(file.name);
      if (!match || seenImages.has(file.name)) continue;
      seenImages.add(file.name);
      images.push({ name: `${match[2]}/${match[1]}/${match[2]}_${match[3]}`, data: file.data });
      // 資料夾名稱為「代號5」這種形式，方便老師直接辨識。
    }
  }
  const seats = [...new Set(rows.map((line) => line.split(',')[2] || '未填'))];
  const encoder = new TextEncoder();
  const csv = '﻿' + [CSV_HEADER, ...rows].join('\n');
  return {
    files: [{ name: '總表.csv', data: encoder.encode(csv) }, ...images],
    rowCount: rows.length,
    imageCount: images.length,
    seats,
  };
}

// 匯出 CSV：文字紀錄；字跡影像另外放在 exportFiles 的檔案中。
export function toCsv(records) {
  const rows = [CSV_HEADER.split(',')];
  for (const s of records.sessions) {
    s.attempts.forEach((a, i) => {
      rows.push(['recall', s.at, s.seat, s.lesson, s.char, s.word, `attempt${i + 1}`, a.blank ? 'blank' : 'written', a.self ?? '', '']);
    });
    if (s.correction) rows.push(['correction', s.at, s.seat, s.lesson, s.char, s.word, 'written', '', '', '']);
  }
  for (const r of records.retention) {
    rows.push(['retention', r.at, r.seat, r.lesson, r.char, r.word, r.delay, r.mode, r.result, r.intervalDays ?? '']);
  }
  return '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\n');
}
