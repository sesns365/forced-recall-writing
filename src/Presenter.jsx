import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import StrokeView from './StrokeView.jsx';
import StrokeWriter from './StrokeWriter.jsx';
import { targetOf, zhuyinOf, speakableMnemonic } from './logic.js';
import { loadStrokes } from './data.js';
import { speak } from './speech.js';

const W = 1920;
const H = 1080;

function youtubeId(url) {
  const m = /(?:youtu\.be\/|v=|embed\/)([\w-]{11})/.exec(url || '');
  return m ? m[1] : null;
}

// 1920×1080 的投影畫面，依視窗等比例縮放
function useScale() {
  const calc = () => Math.min(window.innerWidth / W, window.innerHeight / H);
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const on = () => setScale(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return scale;
}

// 依教案流程排出投影片：封面 → 情境 → 每個字（語詞 → 字卡 → 每日一字 → 部件與口訣）→ 進入練習
function buildSlides(lesson) {
  const slides = [{ kind: 'cover' }, { kind: 'scene' }];
  lesson.entries.forEach((entry, i) => {
    for (const kind of ['word', 'card', 'video', 'parts']) slides.push({ kind, entry, i });
  });
  slides.push({ kind: 'go' });
  return slides;
}

const KIND_NAME = { word: '語詞', card: '字卡', video: '每日一字', parts: '部件與口訣' };

export default function Presenter({ lesson, parts, practiceUrl, onExit }) {
  const slides = useMemo(() => buildSlides(lesson), [lesson]);
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [strokes, setStrokes] = useState({});
  const [qr, setQr] = useState('');
  const scale = useScale();
  const slide = slides[index];

  useEffect(() => {
    lesson.entries.forEach((entry) => {
      const c = targetOf(entry);
      loadStrokes(c).then((d) => setStrokes((s) => ({ ...s, [c]: d }))).catch(() => {});
    });
    QRCode.toString(practiceUrl, { type: 'svg', margin: 1 }).then(setQr).catch(() => {});
  }, [lesson, practiceUrl]);

  function go(delta) {
    // 情境頁先「圈出語詞」再換頁
    if (delta > 0 && slide.kind === 'scene' && !reveal) {
      setReveal(true);
      return;
    }
    setIndex((v) => Math.min(slides.length - 1, Math.max(0, v + delta)));
    setReveal(false);
  }

  useEffect(() => {
    const onKey = (e) => {
      if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); go(1); }
      if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(-1); }
      if (e.key === 'Escape' && !document.fullscreenElement) onExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const entry = slide.entry;
  const char = entry ? targetOf(entry) : '';
  const info = parts?.[char] ?? {};
  const data = strokes[char];

  // 情境句：圈出四個目標字；句子裡有完整語詞的（如「國際」），整個語詞一起圈
  function sentenceMarked() {
    const text = Array.from(lesson.sentence);
    const marked = new Array(text.length).fill(0); // 0 不圈、1 語詞、2 目標字
    lesson.entries.forEach((e) => {
      const at = lesson.sentence.indexOf(e.word);
      if (at >= 0) Array.from(e.word).forEach((_, k) => { marked[at + k] = Math.max(marked[at + k], 1); });
      const c = targetOf(e);
      text.forEach((ch, k) => { if (ch === c) marked[k] = 2; });
    });
    return text.map((ch, k) => {
      if (!reveal || !marked[k]) return <span key={k}>{ch}</span>;
      return <mark key={k} className={marked[k] === 2 ? 'm-char' : 'm-word'}>{ch}</mark>;
    });
  }

  function wordRuby(e, big) {
    const zy = e.pinyin.split(/\s+/);
    return (
      <span className={big ? 'ruby-word big' : 'ruby-word'}>
        {Array.from(e.word).map((c, k) => (
          <ruby key={k} className={k === e.targetIdx ? 'tgt' : ''}>{c}<rt>{zy[k]}</rt></ruby>
        ))}
      </span>
    );
  }

  let body = null;
  if (slide.kind === 'cover') {
    body = (
      <div className="d-cover">
        <p className="d-kicker">「字」從心生　強制回憶寫字</p>
        <h1>第 {lesson.number} 節</h1>
        <p className="d-date">{lesson.date}</p>
        <p className="d-focus">{lesson.focus}</p>
        <p className="d-steps">讀 → 拆 → 看 → 蓋 → 對</p>
      </div>
    );
  } else if (slide.kind === 'scene') {
    body = (
      <div className="d-scene">
        <img src={`${import.meta.env.BASE_URL}${lesson.scene}`} alt="情境圖" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
        <div className="d-sentence">
          <p>{sentenceMarked()}</p>
          <div className="d-tools">
            <button type="button" onClick={() => speak(lesson.sentence)}>唸句子</button>
            {!reveal && <button type="button" className="primary" onClick={() => setReveal(true)}>圈出今天的字</button>}
          </div>
        </div>
        {!reveal && <p className="d-ask">句子裡有哪些字，是今天要學的？</p>}
      </div>
    );
  } else if (slide.kind === 'word') {
    body = (
      <div className="d-word">
        <p className="d-kicker">第 {slide.i + 1} 個語詞</p>
        {wordRuby(entry, true)}
        <p className="d-meaning">{info.meaning}</p>
        {info.note && <p className="d-note">{info.note}</p>}
        <div className="d-tools">
          <button type="button" onClick={() => speak(entry.word)}>唸語詞</button>
          <button type="button" onClick={() => speak(`${entry.word}。${info.meaning}`)}>唸意思</button>
        </div>
      </div>
    );
  } else if (slide.kind === 'card') {
    body = (
      <div className="d-card">
        <div className="d-grid kai">{char}</div>
        <div className="d-card-info">
          <p className="d-zhuyin">{zhuyinOf(entry)}</p>
          <p className="d-word-small">{wordRuby(entry, false)}</p>
          {data && <p className="d-meta">{data.strokes.length} 畫</p>}
          <button type="button" onClick={() => speak(entry.word)}>唸</button>
        </div>
      </div>
    );
  } else if (slide.kind === 'video') {
    const id = youtubeId(info.video);
    body = (
      <div className="d-video">
        {id ? (
          <iframe
            title="每日一字"
            src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <div className="d-writer">
            {data ? <StrokeWriter key={char} data={data} mode="watch" /> : <p>載入筆順中…</p>}
            <p className="d-meta">這個字沒有每日一字影片，改看筆順動畫。</p>
          </div>
        )}
        {id && (
          <a className="d-yt" href={info.video} target="_blank" rel="noopener noreferrer">在 YouTube 開啟（影片無法播放時使用）</a>
        )}
      </div>
    );
  } else if (slide.kind === 'parts') {
    const list = info.parts ?? [];
    body = (
      <div className="d-parts">
        <div className="d-parts-char">
          {data ? <StrokeView data={data} groups={list.map((p) => p.strokes)} /> : <div className="kai d-grid">{char}</div>}
        </div>
        <div className="d-parts-info">
          <p className="d-parts-line">{list.map((p) => p.label).join('＋')}</p>
          {info.mnemonic && <p className="d-mnemonic">{info.mnemonic}</p>}
          {info.mnemonic && (
            <button type="button" onClick={() => speak(speakableMnemonic(info.mnemonic))}>一起唸口訣</button>
          )}
          {info.tips && <p className="d-tips">注意：{info.tips}</p>}
        </div>
      </div>
    );
  } else if (slide.kind === 'go') {
    body = (
      <div className="d-go">
        <div className="d-go-text">
          <h2>拿出平板，開始練習！</h2>
          <ol>
            <li>掃描 QR code，或打開首頁選「第 {lesson.number} 節　學生練習」</li>
            <li>拆部件、練習寫，再蓋起來寫 4 遍，自己核對</li>
            <li>4 個字都完成，會進入隨堂測驗</li>
          </ol>
          <p className="d-url">{practiceUrl}</p>
        </div>
        {/* QR code 由 qrcode 套件產生的 SVG */}
        <div className="d-qr" dangerouslySetInnerHTML={{ __html: qr }} />
      </div>
    );
  }

  return (
    <div className="deck-wrap">
      <div className="deck" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        <header className="d-head">
          <span>第 {lesson.number} 節　{slide.entry ? `${slide.i + 1}／4　${KIND_NAME[slide.kind]}` : ''}</span>
          <span className="d-dots" aria-hidden="true">
            {slides.map((_, k) => <i key={k} className={k === index ? 'on' : k < index ? 'past' : ''} />)}
          </span>
        </header>
        <section className={`d-body d-${slide.kind}-wrap`}>{body}</section>
        <footer className="d-foot">
          <button type="button" onClick={onExit}>離開</button>
          <button
            type="button"
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())?.catch?.(() => {})}
          >全螢幕</button>
          <span className="d-spacer" />
          <button type="button" onClick={() => go(-1)} disabled={index === 0}>◀ 上一頁</button>
          <button type="button" className="primary" onClick={() => go(1)} disabled={index === slides.length - 1}>下一頁 ▶</button>
        </footer>
      </div>
    </div>
  );
}
