import { useEffect, useRef } from 'react';

// 田字格書寫板：內部座標 600×600，匯出時縮成 300×300 以節省本機空間。
const N = 600;

function paintGrid(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, N, N);
  ctx.strokeStyle = '#b91c1c';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 12]);
  ctx.beginPath();
  ctx.moveTo(N / 2, 0); ctx.lineTo(N / 2, N);
  ctx.moveTo(0, N / 2); ctx.lineTo(N, N / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeRect(2, 2, N - 4, N - 4);
}

// padRef 由父層提供：父層可呼叫 clear()、hasInk()、png()。
export default function Pad({ padRef, disabled = false }) {
  const canvas = useRef(null);
  const strokes = useRef([]);
  const current = useRef(null);

  const paint = () => {
    if (!canvas.current) return; // 已卸載時不再繪製
    const ctx = canvas.current.getContext('2d');
    paintGrid(ctx);
    ctx.strokeStyle = '#183f86';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const line of [...strokes.current, current.current]) {
      if (!line || !line.length) continue;
      ctx.beginPath();
      ctx.moveTo(line[0][0], line[0][1]);
      for (const p of line.slice(1)) ctx.lineTo(p[0], p[1]);
      if (line.length === 1) ctx.lineTo(line[0][0] + 0.1, line[0][1] + 0.1);
      ctx.stroke();
    }
  };

  useEffect(() => {
    paint();
    if (padRef) {
      padRef.current = {
        clear() {
          strokes.current = [];
          current.current = null;
          paint();
        },
        hasInk() {
          return strokes.current.length > 0;
        },
        png(size = 300) {
          const out = document.createElement('canvas');
          out.width = size;
          out.height = size;
          out.getContext('2d').drawImage(canvas.current, 0, 0, size, size);
          return out.toDataURL('image/png');
        },
      };
    }
    // 卸載時清掉父層的引用，避免父層呼叫已不存在的畫布。
    return () => {
      if (padRef) padRef.current = null;
    };
    // 只在掛載時設定一次；paint 每次重新讀取 ref，不需要依賴。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const position = (event) => {
    const rect = canvas.current.getBoundingClientRect();
    return [
      ((event.clientX - rect.left) / rect.width) * N,
      ((event.clientY - rect.top) / rect.height) * N,
    ];
  };

  return (
    <canvas
      ref={canvas}
      width={N}
      height={N}
      className={'pad' + (disabled ? ' pad-disabled' : '')}
      aria-label="書寫田字格"
      onPointerDown={(e) => {
        if (disabled) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        current.current = [position(e)];
        paint();
      }}
      onPointerMove={(e) => {
        if (!current.current) return;
        current.current.push(position(e));
        paint();
      }}
      onPointerUp={() => {
        if (!current.current) return;
        strokes.current.push(current.current);
        current.current = null;
        paint();
      }}
      onPointerCancel={() => {
        current.current = null;
        paint();
      }}
    />
  );
}
