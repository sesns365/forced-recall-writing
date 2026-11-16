import { useEffect, useRef, useState } from 'react';
import Pad from './Pad.jsx';
import StrokeView from './StrokeView.jsx';
import StrokeWriter from './StrokeWriter.jsx';

export const PRACTICE_TIMES = 4;
const PEEK_SECONDS = 3;

// 練習寫 4 次（遮住之前的練習，可以看範字）；至少完成 1 次「跟著筆順寫」才能進入下一步：
// 「直接寫」在田字格自由書寫；「跟著筆順寫」寫對一筆才出現標準筆畫（同自由練字板）。
export default function PracticeWrite({ data, char, onDone, onGuided }) {
  const [mode, setMode] = useState('guided');
  const [writes, setWrites] = useState([]);
  const [peek, setPeek] = useState(0);
  const [round, setRound] = useState(0);
  const padRef = useRef(null);

  useEffect(() => {
    setWrites([]);
    setRound(0);
  }, [data]);

  useEffect(() => {
    if (peek <= 0) return undefined;
    const timer = setTimeout(() => setPeek((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [peek]);

  const done = writes.length >= PRACTICE_TIMES;
  useEffect(() => { if (done) onDone?.(); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  function add(item) {
    setWrites((list) => (list.length >= PRACTICE_TIMES ? list : [...list, item]));
    if (item.mode === 'guided') onGuided?.();
    setRound((v) => v + 1);
  }

  function finishFree() {
    const pad = padRef.current;
    if (!pad?.hasInk()) return;
    add({ png: pad.png(160), mode: 'free' });
    pad.clear();
  }

  return (
    <>
      <div className="visual">
        {peek > 0 ? (
          <div className="peek">
            <StrokeView data={data} fallbackChar={char} />
            <p className="hint">{peek} 秒</p>
          </div>
        ) : mode === 'free' ? (
          <Pad padRef={padRef} />
        ) : (
          <StrokeWriter key={`g${round}`} data={data} mode="guided" onDone={() => setTimeout(() => add({ png: null, mode: 'guided' }), 900)} />
        )}
      </div>
      <div className="row" role="radiogroup" aria-label="寫法">
        <button type="button" role="radio" aria-checked={mode === 'free'} className={mode === 'free' ? 'primary' : ''} onClick={() => setMode('free')}>直接寫</button>
        <button type="button" role="radio" aria-checked={mode === 'guided'} className={mode === 'guided' ? 'primary' : ''} onClick={() => setMode('guided')}>跟著筆順寫</button>
      </div>
      <div className="practice-slots" aria-label={`已練習 ${writes.length} 次`}>
        {Array.from({ length: PRACTICE_TIMES }, (_, i) => (
          <div key={i} className={'slot' + (writes[i] ? ' slot-done' : '')}>
            {writes[i]?.png ? <img src={writes[i].png} alt={`第 ${i + 1} 次`} /> : writes[i] ? '⭐' : i + 1}
          </div>
        ))}
      </div>
      <p role="status" className="countdown">{done ? '⭐ 練習 4 次完成！' : `第 ${writes.length + 1} 次，共 ${PRACTICE_TIMES} 次`}</p>
      <div className="row">
        {mode === 'free' && peek <= 0 && (
          <>
            <button type="button" className="primary" onClick={finishFree}>寫好了</button>
            <button type="button" onClick={() => padRef.current?.clear()}>擦掉</button>
          </>
        )}
        <button type="button" onClick={() => setPeek(PEEK_SECONDS)} disabled={peek > 0}>看範字 {PEEK_SECONDS} 秒</button>
      </div>
    </>
  );
}
