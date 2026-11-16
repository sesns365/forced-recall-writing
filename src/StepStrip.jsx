// 五大步驟列（步驟卡的五格小圖）：目前的步驟亮起來。
export const STEPS = [
  { name: '讀', color: '#2563eb' },
  { name: '拆', color: '#ea580c' },
  { name: '看', color: '#16a34a' },
  { name: '蓋', color: '#7c3aed' },
  { name: '對', color: '#dc2626' },
];

export default function StepStrip({ current }) {
  const base = import.meta.env.BASE_URL;
  return (
    <ol className="step-strip" aria-label="寫字五大步驟">
      {STEPS.map((s, i) => (
        <li key={s.name} className={i === current ? 'on' : i < current ? 'past' : ''} style={{ '--c': s.color }} aria-current={i === current ? 'step' : undefined}>
          <img src={`${base}steps/step-${i + 1}.jpg`} alt="" />
          <span className="kai">{s.name}</span>
        </li>
      ))}
    </ol>
  );
}
