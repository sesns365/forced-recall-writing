import { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';

// 看筆順（mode="watch"）與跟著筆順寫（mode="guided"：沒有範字輪廓，寫對一筆才出現標準筆畫，連錯兩次才提示）。
// 筆順資料由呼叫端提供（data: { strokes, medians }），不連網。
export default function StrokeWriter({ data, mode, onDone }) {
  const box = useRef(null);
  const writer = useRef(null);
  const [run, setRun] = useState(0);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!data || !box.current) return undefined;
    box.current.innerHTML = '';
    const size = 320;
    const w = HanziWriter.create(box.current, 'X', {
      width: size,
      height: size,
      padding: 16,
      charDataLoader: (_c, ok) => ok(data),
      showCharacter: false,
      showOutline: false,
      outlineColor: '#cbd5e1',
      strokeColor: '#183f86',
      radicalColor: null,
      highlightColor: '#f97316',
      drawingColor: '#183f86',
      drawingWidth: 22,
      strokeAnimationSpeed: 0.8,
      delayBetweenStrokes: 600,
      showHintAfterMisses: 2,
      highlightOnComplete: true,
    });
    box.current.querySelector('svg')?.setAttribute('viewBox', `0 0 ${size} ${size}`);
    writer.current = w;
    let live = true;
    if (mode === 'watch') {
      setStatus('看清楚起筆、方向和順序。');
      w.animateCharacter({ onComplete: () => { if (live) { setStatus('播放完成。'); onDone?.(); } } });
    } else {
      setStatus('從第一筆開始寫，寫對了筆畫才會出現。');
      w.quiz({
        onMistake: (s) => live && setStatus(s.mistakesOnStroke >= 2 ? '看橘色提示，再寫一次。' : '再想想起筆和方向。'),
        onCorrectStroke: (s) => live && setStatus(`第 ${s.strokeNum + 1} 筆正確！`),
        onComplete: () => { if (live) { setStatus('⭐ 寫完了！'); onDone?.(); } },
      });
    }
    return () => {
      live = false;
      try { w.cancelQuiz(); } catch { /* 沒有進行中的描寫 */ }
      try { w.pauseAnimation(); } catch { /* 沒有進行中的動畫 */ }
      writer.current = null;
    };
  }, [data, mode, run]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="writer">
      <div className="writer-box visual">
        <svg viewBox="0 0 320 320" className="grid-bg" aria-hidden="true">
          <path d="M160 0V320M0 160H320" stroke="#b91c1c" strokeOpacity=".4" strokeDasharray="6 6" />
        </svg>
        <div ref={box} className="writer-layer" />
      </div>
      <p role="status" className="countdown">{status}</p>
      {mode === 'watch' && <button type="button" onClick={() => setRun((v) => v + 1)}>再看一次</button>}
    </div>
  );
}
