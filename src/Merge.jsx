import { useEffect, useState } from 'react';
import { mergeExports } from './logic.js';
import { readZip, makeZip } from './zip.js';

// 老師用：一次選取各台裝置匯出的 ZIP，合併成一份總表與依代號分好的字跡資料夾。
export default function Merge() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    return () => {
      if (result) URL.revokeObjectURL(result.url);
    };
  }, [result]);

  async function merge(event) {
    const picked = [...event.target.files];
    if (!picked.length) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const lists = [];
      for (const file of picked) {
        lists.push(readZip(new Uint8Array(await file.arrayBuffer())));
      }
      const merged = mergeExports(lists);
      const zip = makeZip(merged.files);
      const url = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));
      setResult({ ...merged, url, fileCount: picked.length });
    } catch (e) {
      setError(e.message || '合併失敗，請確認選取的是匯出的 ZIP 檔。');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  return (
    <section className="panel">
      <h2>匯入合併</h2>
      <p className="hint">把每台裝置匯出的 ZIP 一次選取（可多選），會產生一份總表與依代號分好的字跡資料夾。</p>
      <input type="file" accept=".zip,application/zip" multiple onChange={merge} disabled={busy} />
      {busy && <p role="status">合併中…</p>}
      {error && <p role="alert" className="warn">{error}</p>}
      {result && (
        <div className="stage">
          <p role="status" className="message">
            已合併 {result.fileCount} 份匯出，共 {result.rowCount} 筆文字紀錄、{result.imageCount} 張字跡，代號：{result.seats.join('、')}
          </p>
          <a className="download" href={result.url} download="合併紀錄.zip">下載合併結果</a>
        </div>
      )}
    </section>
  );
}
