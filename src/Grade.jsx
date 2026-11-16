import { useEffect, useState } from 'react';
import { RESULTS, DELAYS } from './logic.js';
import { loadRecords, updateRetention, CHANGED_EVENT } from './records.js';

const DELAY_TEXT = Object.fromEntries(DELAYS);
const RESULT_TEXT = Object.fromEntries(RESULTS);

// 老師批改：看學生的字跡與範字，依評量紀錄表按 ○ △ × 空白。
export default function Grade() {
  const [records, setRecords] = useState(loadRecords);
  const [onlyPending, setOnlyPending] = useState(true);

  useEffect(() => {
    const refresh = () => setRecords(loadRecords());
    window.addEventListener(CHANGED_EVENT, refresh);
    return () => window.removeEventListener(CHANGED_EVENT, refresh);
  }, []);

  const list = records.retention.filter((r) => !onlyPending || !r.result);
  const pending = records.retention.filter((r) => !r.result).length;

  return (
    <section className="panel">
      <h2>批改測驗</h2>
      <div className="row">
        <button type="button" aria-pressed={onlyPending} onClick={() => setOnlyPending(true)}>未批改（{pending}）</button>
        <button type="button" aria-pressed={!onlyPending} onClick={() => setOnlyPending(false)}>全部（{records.retention.length}）</button>
      </div>
      {!list.length && <p className="hint">{onlyPending ? '沒有待批改的測驗。' : '還沒有測驗紀錄。'}</p>}
      <div className="grade-list">
        {list.map((r) => (
          <div key={r.id} className="grade-item">
            <div className="grade-pair">
              <div className="kai grade-model">{r.char}</div>
              {r.png ? <img src={r.png} alt="學生字跡" /> : <div className="blank">空白</div>}
            </div>
            <p className="hint">
              {r.word}｜{DELAY_TEXT[r.delay] ?? r.delay}｜{r.mode === 'zhuyin' ? '看注音' : '聽寫'}
              {r.intervalDays !== null && r.intervalDays !== undefined && `｜間隔 ${r.intervalDays} 天`}
              ｜{new Date(r.at).toLocaleDateString('zh-TW')}
            </p>
            <div className="row">
              {RESULTS.map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={r.result === value}
                  onClick={() => updateRetention(r.id, { result: value })}
                >{text}</button>
              ))}
            </div>
            {r.result && <p className="hint">目前：{RESULT_TEXT[r.result]}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
