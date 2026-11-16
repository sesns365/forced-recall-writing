import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  targetOf, zhuyinOf, sentenceText, maskedWord, partsFor, checkCoverage, toCsv, exportFiles, dataUrlBytes,
} from './logic.js';
import { makeZip, readZip, crc32 } from './zip.js';
import { mergeExports, CSV_HEADER } from './logic.js';

test('ZIP 寫出後可以原樣讀回', () => {
  const files = [
    { name: 'records.csv', data: new TextEncoder().encode('a,b\n1,2') },
    { name: '強制回憶/代號5_小_1_第1遍.png', data: new Uint8Array([1, 2, 3]) },
  ];
  const back = readZip(makeZip(files));
  assert.equal(back.length, 2);
  assert.equal(back[1].name, '強制回憶/代號5_小_1_第1遍.png');
  assert.deepEqual([...back[1].data], [1, 2, 3]);
});

test('合併多台裝置：總表去除重複並保留一個標題列，字跡依代號分資料夾', () => {
  const csvOf = (lines) => new TextEncoder().encode('﻿' + [CSV_HEADER, ...lines].join('\n'));
  const dev5 = [
    { name: 'records.csv', data: csvOf(['recall,t1,5,L,小,小船,attempt1,written,']) },
    { name: '強制回憶/代號5_小_1_第1遍.png', data: new Uint8Array([1]) },
  ];
  const dev6 = [
    { name: 'records.csv', data: csvOf(['recall,t1,5,L,小,小船,attempt1,written,', 'retention,t2,6,L,船,小船,week1,zhuyin,correct']) },
    { name: '保留測驗/代號6_船_week1_1.png', data: new Uint8Array([2]) },
    { name: '強制回憶/代號5_小_1_第1遍.png', data: new Uint8Array([1]) },
  ];
  const merged = mergeExports([dev5, dev6]);
  assert.equal(merged.rowCount, 2);
  assert.equal(merged.imageCount, 2);
  assert.deepEqual(merged.seats, ['5', '6']);
  const names = merged.files.map((f) => f.name);
  assert.ok(names.includes('代號5/強制回憶/代號5_小_1_第1遍.png'));
  assert.ok(names.includes('代號6/保留測驗/代號6_船_week1_1.png'));
  const csv = new TextDecoder().decode(merged.files[0].data);
  assert.equal(csv.split('\n').filter((l) => l === CSV_HEADER).length, 1);
});

test('crc32 與標準值一致', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('ZIP 含正確的檔案數與結尾標記', () => {
  const zip = makeZip([{ name: '中文/a.txt', data: new TextEncoder().encode('hello') }]);
  const view = new DataView(zip.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(zip.length - 22, true), 0x06054b50);
  assert.equal(view.getUint16(zip.length - 22 + 8, true), 1);
});

test('匯出會把 PNG 轉成檔案並保留 CSV', () => {
  const png = 'data:image/png;base64,' + Buffer.from([137, 80, 78, 71]).toString('base64');
  const files = exportFiles({
    sessions: [{ seat: '5', char: '船', attempts: [{ png, blank: false }, { png: null, blank: true }] }],
    retention: [],
  });
  assert.equal(files[0].name, 'records.csv');
  assert.equal(files.length, 2);
  assert.deepEqual([...dataUrlBytes(png)], [137, 80, 78, 71]);
});

const entry = {
  word: '小船',
  pinyin: 'ㄒㄧㄠˇ ㄔㄨㄢˊ',
  targetIdx: 1,
  sentence: '爺爺划著[  ]，慢慢靠近岸邊。',
};

test('目標字與注音取自 targetIdx', () => {
  assert.equal(targetOf(entry), '船');
  assert.equal(zhuyinOf(entry), 'ㄔㄨㄢˊ');
});

test('注音數量與字數不符時回傳 null', () => {
  assert.equal(zhuyinOf({ ...entry, pinyin: 'ㄒㄧㄠˇㄔㄨㄢˊ' }), null);
});

test('回想階段的例句與語詞不含目標字', () => {
  const blanked = sentenceText(entry, false);
  assert.ok(!blanked.includes('船'));
  assert.equal(sentenceText(entry, true), '爺爺划著船，慢慢靠近岸邊。');
  assert.equal(maskedWord(entry), '小□');
  assert.ok(!maskedWord(entry).includes('船'));
});

test('部件覆蓋檢查：缺漏與重複', () => {
  const parts = [{ label: 'a', strokes: [0, 1] }, { label: 'b', strokes: [1, 3] }];
  const { missing, duplicated } = checkCoverage(parts, 4);
  assert.deepEqual(missing, [2]);
  assert.deepEqual(duplicated, [1]);
});

test('沒有部件資料時 partsFor 回傳 null', () => {
  assert.equal(partsFor({}, '船'), null);
  assert.equal(partsFor({ 船: { parts: [] } }, '船'), null);
});

test('CSV 會跳脫逗號與引號，並加上 BOM', () => {
  const csv = toCsv({
    sessions: [],
    retention: [{ at: 't', seat: '1', lesson: 'L,1', char: '船', word: '小船', delay: 'week1', mode: 'zhuyin', result: 'wrong' }],
  });
  assert.ok(csv.startsWith('﻿'));
  assert.ok(csv.includes('"L,1"'));
});

import { intervalDays, normalizeLessons, speakableMnemonic } from './logic.js';

test('實際間隔天數取測驗前最近一次練習', () => {
  const sessions = [
    { char: '投', at: '2026-11-01T02:00:00Z' },
    { char: '投', at: '2026-11-03T02:00:00Z' },
    { char: '投', at: '2026-11-20T02:00:00Z' },
    { char: '究', at: '2026-11-09T02:00:00Z' },
  ];
  assert.equal(intervalDays(sessions, '投', '2026-11-10T03:00:00Z'), 7);
  assert.equal(intervalDays(sessions, '股', '2026-11-10T03:00:00Z'), null);
});

test('教材格式正規化與口訣報讀', () => {
  const arr = [{ id: 'a' }];
  assert.deepEqual(normalizeLessons(arr), { practice: arr, retention: arr });
  assert.equal(speakableMnemonic('手＋殳是投'), '手加殳是投');
});

import { checkPaint } from './logic.js';

test('拆部件檢查：同名部件可互換，塗錯的筆畫會被標出', () => {
  const xie = [{ label: '十', strokes: [0, 1] }, { label: '力', strokes: [2, 3] }, { label: '力', strokes: [4, 5] }, { label: '力', strokes: [6, 7] }];
  assert.equal(checkPaint([0, 0, 2, 2, 1, 1, 3, 3], xie).done, true);
  const bad = checkPaint([0, 0, 1, 1, 1, 2, 2, 3], xie);
  assert.equal(bad.done, false);
  assert.ok(bad.wrong.length > 0);
  const tou = [{ label: '扌', strokes: [0, 1, 2] }, { label: '殳', strokes: [3, 4, 5, 6] }];
  assert.deepEqual(checkPaint([0, 0, 0, 1, 1, 1, -1], tou).wrong, [6]);
  assert.deepEqual(checkPaint([0, 0, 1, 1, 1, 1, 1], tou).wrong, [2]);
});
