import { useEffect, useRef, useState } from 'react';
import Pad from './Pad.jsx';
import StrokeView from './StrokeView.jsx';
import StrokeWriter from './StrokeWriter.jsx';

const PEEK_SECONDS = 3;

// 練習寫：完成 1 次「跟著筆順寫」（寫對一筆才出現標準筆畫，同自由練字板）才算完成。
// 「直接寫」可以多練，不計次數。
export default function PracticeWrite({ data, char, onDone }) {
  const [mode, setMode] = useState('guided');
  const [guidedDone, setGuidedDone] = useState(false);
  const [freeCount, setFreeCount] = useState(0);
  const [peek, setPeek] = useState(0);
  const [round, setRound] = useState(0);
  const padRef = useRef(null);

  useEffect(() => {
    setGuidedDone(false);
    setFreeCount(0);
    setRound(0);
  }, [data]);

  useEffect(() => {
    if (peek <= 0) return undefined;
    const timer = setTimeout(() => setPeek((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [peek]);

  function finishGuided() {
    setTimeout(() => {
      setGuidedDone(true);
      setRound((v) => v + 1);
      onDone?.();
    }, 900);
  }

  function finishFree() {
    const pad = padRef.current;
    if (!pad?.hasInk()) return;
    setFreeCount((n) => n + 1);
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
          <StrokeWriter key={`g${round}`} data={data} mode="guided" onDone={finishGuided} />
        )}
      </div>
      <div className="row" role="radiogroup" aria-label="寫法">
        <button type="button" role="radio" aria-checked={mode === 'guided'} className={mode === 'guided' ? 'primary' : ''} onClick={() => setMode('guided')}>跟著筆順寫</button>
        <button type="button" role="radio" aria-checked={mode === 'free'} className={mode === 'free' ? 'primary' : ''} onClick={() => setMode('free')}>直接寫</button>
      </div>
      <p role="status" className="countdown">
        {guidedDone ? '⭐ 練習完成！可以再多寫，或按「下一步」。' : '完成 1 次「跟著筆順寫」就可以進入下一步。'}
        {freeCount > 0 && `（直接寫 ${freeCount} 次）`}
      </p>
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
