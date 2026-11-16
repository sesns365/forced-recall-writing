import { useEffect, useState } from 'react';
import { checkPaint } from './logic.js';
import { PALETTE } from './StrokeView.jsx';

// 拆部件：選一個部件顏色，再點筆畫塗上去；全部塗完按「檢查」。
export default function PartsPaint({ data, partList, onDone }) {
  const [mapping, setMapping] = useState(() => data.strokes.map(() => -1));
  const [color, setColor] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    setMapping(data.strokes.map(() => -1));
    setColor(0);
    setResult(null);
  }, [data, partList]);

  // 同名部件加上編號，例如「力①」「力②」
  const names = partList.map((p, g) => {
    const same = partList.filter((q) => q.label === p.label);
    return same.length > 1 ? `${p.label}${'①②③④⑤'[same.indexOf(p)]}` : p.label;
  });

  function paint(i) {
    setResult(null);
    setMapping((m) => m.map((v, j) => (j === i ? (v === color ? -1 : color) : v)));
  }

  function check() {
    const r = checkPaint(mapping, partList);
    setResult(r);
    if (r.done) onDone?.();
  }

  const wrong = new Set(result?.wrong ?? []);
  return (
    <>
      <div className="row" role="radiogroup" aria-label="選部件顏色">
        {partList.map((p, g) => (
          <button
            key={g}
            type="button"
            role="radio"
            aria-checked={color === g}
            className={'chip' + (color === g ? ' chip-on' : '')}
            style={{ borderColor: PALETTE[g], color: PALETTE[g] }}
            onClick={() => setColor(g)}
          >{names[g]}</button>
        ))}
      </div>
      <div className="visual">
      <svg viewBox="0 0 1024 1024" className="strokes paint" role="img" aria-label="點筆畫塗上部件顏色">
        <path d="M512 0V1024M0 512H1024" stroke="#b91c1c" strokeOpacity=".3" strokeWidth="4" strokeDasharray="16 16" />
        <g transform="translate(0,900) scale(1,-1)">
          {data.strokes.map((d, i) => (
            <path
              key={i}
              d={d}
              fill={mapping[i] < 0 ? '#cbd5e1' : PALETTE[mapping[i]]}
              stroke={wrong.has(i) ? '#dc2626' : 'none'}
              strokeWidth={wrong.has(i) ? 28 : 0}
              onClick={() => paint(i)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </g>
      </svg>
      </div>
      <p role="status" className="countdown">
        {result ? (result.done ? '⭐ 拆對了！' : `紅框的筆畫再想一想（${result.wrong.length} 筆）。`) : '選顏色，點筆畫。'}
      </p>
      <div className="row">
        <button type="button" className="primary" onClick={check}>檢查</button>
        <button type="button" onClick={() => { setMapping(data.strokes.map(() => -1)); setResult(null); }}>全部擦掉</button>
      </div>
    </>
  );
}
