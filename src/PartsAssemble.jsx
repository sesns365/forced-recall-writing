import { useEffect, useRef, useState } from 'react';
import { PALETTE } from './StrokeView.jsx';

const GRID = 1024;
const SNAP = 150; // 離正確位置這麼近就自動吸附

// 每個部件的外框（以畫面座標計算，y 已翻轉；中線外加筆畫寬度的邊距）
const PAD = 70;
function boxOf(data, strokes) {
  const pts = strokes.flatMap((i) => data.medians[i]).map(([x, y]) => [x, 900 - y]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs) - PAD, x1: Math.max(...xs) + PAD, y0: Math.min(...ys) - PAD, y1: Math.max(...ys) + PAD };
}

// 待組區排列：部件先縮小（TRAY_SCALE），依實際大小由左到右排，排不下就換行；
// 順序倒過來，避免剛好是原本位置。dx、dy 是部件中心的位移，縮放以部件中心為準。
const TRAY_SCALE = 0.55;
function layout(data, partList) {
  const GAP = 30;
  const top = GRID + 110;
  let x = GAP;
  let y = top;
  let rowH = 0;
  const pieces = new Array(partList.length);
  const centers = partList.map((p) => {
    const b = boxOf(data, p.strokes);
    return { cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2, w: (b.x1 - b.x0) * TRAY_SCALE, h: (b.y1 - b.y0) * TRAY_SCALE };
  });
  [...partList.keys()].reverse().forEach((g) => {
    const { cx, cy, w, h } = centers[g];
    if (x + w > GRID - GAP && x > GAP) {
      x = GAP;
      y += rowH + GAP;
      rowH = 0;
    }
    pieces[g] = { dx: x + w / 2 - cx, dy: y + h / 2 - cy, k: TRAY_SCALE, placed: false };
    x += w + GAP;
    rowH = Math.max(rowH, h);
  });
  return { pieces, centers, height: y + rowH + GAP };
}

// 組部件：把下方打散的部件拖回田字格，位置對了會自動吸附。
export default function PartsAssemble({ data, partList, onDone }) {
  const svg = useRef(null);
  const drag = useRef(null);
  const [pieces, setPieces] = useState(() => layout(data, partList).pieces);
  const { centers, height: HEIGHT } = layout(data, partList); // 上方田字格，下方待組區
  const boxes = partList.map((p) => boxOf(data, p.strokes));

  useEffect(() => setPieces(layout(data, partList).pieces), [data, partList]);

  const placed = pieces.filter((p) => p.placed).length;
  const done = placed === partList.length;
  useEffect(() => { if (done) onDone?.(); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const point = (e) => new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.current.getScreenCTM().inverse());

  function down(e, g) {
    if (pieces[g].placed) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e);
    drag.current = { g, x: p.x, y: p.y, dx: pieces[g].dx, dy: pieces[g].dy };
    // 拿起來就恢復原大小（以部件中心縮放，所以中心位置不變）
    setPieces((list) => list.map((q, i) => (i === g ? { ...q, k: 1 } : q)));
  }

  function move(e) {
    const d = drag.current;
    if (!d) return;
    const p = point(e);
    setPieces((list) => list.map((q, i) => (i === d.g ? { ...q, dx: d.dx + p.x - d.x, dy: d.dy + p.y - d.y } : q)));
  }

  function up() {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setPieces((list) => list.map((q, i) => {
      if (i !== d.g) return q;
      return Math.hypot(q.dx, q.dy) < SNAP ? { dx: 0, dy: 0, k: 1, placed: true } : q;
    }));
  }

  return (
    <>
      <div className="visual">
      <svg
        ref={svg}
        viewBox={`0 0 ${GRID} ${HEIGHT}`}
        className="assemble"
        role="img"
        aria-label="把部件拖回田字格"
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <rect x="8" y="8" width={GRID - 16} height={GRID - 16} fill="#fff" stroke="#b91c1c" strokeWidth="8" rx="24" />
        <path d={`M512 8V${GRID - 8}M8 512H${GRID - 8}`} stroke="#b91c1c" strokeOpacity=".35" strokeWidth="4" strokeDasharray="16 16" />
        <rect x="8" y={GRID + 40} width={GRID - 16} height={HEIGHT - GRID - 48} fill="#f1f5f9" rx="24" />
        <text x="40" y={GRID + 100} fontSize="44" fill="#64748b">待組區：把部件拖回田字格</text>
        {partList.map((p, g) => (
          <g
            key={g}
            transform={`translate(${pieces[g].dx + centers[g].cx},${pieces[g].dy + centers[g].cy}) scale(${pieces[g].k}) translate(${-centers[g].cx},${-centers[g].cy})`}
            onPointerDown={(e) => down(e, g)}
            style={{ cursor: pieces[g].placed ? 'default' : 'grab', touchAction: 'none' }}
          >
            {/* 透明外框：按在部件範圍內任何地方都能拿起來（筆畫細的部件也好拿） */}
            <rect x={boxes[g].x0} y={boxes[g].y0} width={boxes[g].x1 - boxes[g].x0} height={boxes[g].y1 - boxes[g].y0} fill="transparent" />
            <g transform="translate(0,900) scale(1,-1)">
              {p.strokes.map((i) => (
                <path key={i} d={data.strokes[i]} fill={PALETTE[g % PALETTE.length]} stroke="transparent" strokeWidth="60" />
              ))}
            </g>
          </g>
        ))}
      </svg>
      </div>
      <p role="status" className="countdown">{done ? '⭐ 組好了！' : `已放回 ${placed}／${partList.length}`}</p>
      <button type="button" onClick={() => setPieces(layout(data, partList).pieces)}>重新打散</button>
    </>
  );
}
