// 台灣標準直式注音：符號由上而下排在字的右側；
// 二、三、四聲調號標在最後一個符號的右側；輕聲「˙」標在最上方。
const TONES = { 'ˊ': 2, 'ˇ': 3, 'ˋ': 4, '˙': 5 };

export function splitZhuyin(text) {
  const chars = Array.from(text || '');
  let tone = '';
  const symbols = [];
  for (const c of chars) {
    if (TONES[c]) tone = c;
    else if (c.trim()) symbols.push(c);
  }
  return { symbols, tone };
}

// 單一音節的直式注音
export function ZhuyinColumn({ text, className = '' }) {
  const { symbols, tone } = splitZhuyin(text);
  const light = tone === '˙';
  return (
    <span className={`zy ${className}`} aria-label={text}>
      {light && <span className="zy-light">˙</span>}
      {symbols.map((s, i) => (
        <span key={i} className="zy-sym">
          {s}
          {!light && tone && i === symbols.length - 1 && <span className="zy-tone">{tone}</span>}
        </span>
      ))}
    </span>
  );
}

// 國字＋右側直式注音
export function CharZhuyin({ char, zhuyin, highlight = false }) {
  return (
    <span className={'cz' + (highlight ? ' cz-hl' : '')}>
      <span className="cz-char">{char}</span>
      {zhuyin && <ZhuyinColumn text={zhuyin} />}
    </span>
  );
}

// 語詞（每個字都帶直式注音）；pinyin 以空白分隔，數量與字數不同時只顯示國字
export function WordZhuyin({ word, pinyin, targetIdx = -1, className = '' }) {
  const chars = Array.from(word);
  const zy = (pinyin || '').trim().split(/\s+/);
  const ok = zy.length === chars.length;
  return (
    <span className={`wz ${className}`}>
      {chars.map((c, i) => (
        <CharZhuyin key={i} char={c} zhuyin={ok ? zy[i] : null} highlight={i === targetIdx} />
      ))}
    </span>
  );
}
