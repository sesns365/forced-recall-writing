export const PALETTE = ['#183f86', '#b45309', '#047857', '#7c3aed', '#be123c', '#0e7490', '#4d7c0f', '#a16207'];

// 字形顯示：有筆順資料就用筆畫畫出來（可依部件上色）；沒有就用楷書字型。
export default function StrokeView({ data, groups = null, fallbackChar = '' }) {
  if (!data) {
    return <div className="kai big-char">{fallbackChar}</div>;
  }
  const colorOf = (i) => {
    if (!groups) return '#183f86';
    const g = groups.findIndex((list) => list.includes(i));
    return g < 0 ? '#cbd5e1' : PALETTE[g % PALETTE.length];
  };
  return (
    <svg viewBox="0 0 1024 1024" className="strokes" role="img" aria-label="字形">
      <g transform="translate(0,900) scale(1,-1)">
        {data.strokes.map((d, i) => (
          <path key={i} d={d} fill={colorOf(i)} />
        ))}
      </g>
    </svg>
  );
}
