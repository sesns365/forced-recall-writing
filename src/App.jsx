import { useEffect, useState } from 'react';
import ForcedRecall from './ForcedRecall.jsx';
import Presenter from './Presenter.jsx';
import { TestSetup, TestRunner } from './Test.jsx';
import Grade from './Grade.jsx';
import Merge from './Merge.jsx';
import { loadLessons, loadParts } from './data.js';
import { loadRecords, getUnexported, getExportedAt, markExported, CHANGED_EVENT, getActiveTest, setActiveTest } from './records.js';
import { exportFiles, EXPORT_REMIND_EVERY } from './logic.js';
import { makeZip } from './zip.js';

const CODE_KEY = 'forced-recall:code';

// 網址：#/（首頁）、#/3/present（第 3 節上課簡報）、#/3/practice（第 3 節學生練習）、#/test、#/teacher
function parseRoute() {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (/^\d+$/.test(parts[0] ?? '')) return { page: parts[1] === 'present' ? 'present' : 'practice', n: Number(parts[0]) };
  if (parts[0] === 'test' || parts[0] === 'teacher') return { page: parts[0] };
  return { page: 'home' };
}

function useRoute() {
  const [route, setRoute] = useState(parseRoute);
  useEffect(() => {
    const on = () => setRoute(parseRoute());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

const goto = (hash) => { window.location.hash = hash; };

// 全螢幕按鈕：瀏覽器不支援（例如 iPhone）就不顯示。
function FullscreenButton() {
  const [on, setOn] = useState(Boolean(document.fullscreenElement));
  useEffect(() => {
    const sync = () => setOn(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  if (!document.documentElement.requestFullscreen) return null;
  return (
    <button
      type="button"
      className="fullscreen"
      onClick={() => (on ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})}
    >{on ? '結束全螢幕' : '全螢幕'}</button>
  );
}

function Home({ lessons }) {
  return (
    <section className="panel home">
      <div className="home-grid">
        {lessons.practice.map((lesson) => (
          <article key={lesson.id} className="home-card">
            <h2>第 {lesson.number} 節</h2>
            <p className="home-chars kai">{lesson.title.replace(/、/g, ' ')}</p>
            <p className="hint">{lesson.date ?? ''}{lesson.strokes ? `　${lesson.strokes}` : ''}</p>
            <div className="row">
              {lesson.sentence && <button type="button" onClick={() => goto(`#/${lesson.number}/present`)}>上課簡報（老師）</button>}
              <button type="button" className="primary" onClick={() => goto(`#/${lesson.number}/practice`)}>學生練習</button>
            </div>
          </article>
        ))}
      </div>
      <div className="row home-more">
        <button type="button" onClick={() => goto('#/test')}>保留／追蹤測驗</button>
        <button type="button" onClick={() => goto('#/teacher')}>老師（批改、匯出）</button>
      </div>
    </section>
  );
}

export default function App() {
  const route = useRoute();
  const [lessons, setLessons] = useState(null);
  const [parts, setParts] = useState({});
  const [loadError, setLoadError] = useState('');
  const [activeTest, setActive] = useState(getActiveTest);
  const [seat, setSeat] = useState(() => localStorage.getItem(CODE_KEY) || '');
  const [codeDraft, setCodeDraft] = useState('');
  const [unexported, setUnexported] = useState(getUnexported);
  const [exportedAt, setExportedAt] = useState(getExportedAt);

  useEffect(() => {
    Promise.all([loadLessons(), loadParts()])
      .then(([l, p]) => {
        setLessons(l);
        setParts(p);
      })
      .catch((error) => setLoadError(error.message));
  }, []);

  // 每次存檔後更新未匯出筆數，讓提醒即時出現
  useEffect(() => {
    const refresh = () => setUnexported(getUnexported());
    window.addEventListener(CHANGED_EVENT, refresh);
    return () => window.removeEventListener(CHANGED_EVENT, refresh);
  }, []);

  function startTest(test) {
    setActiveTest(test);
    setActive(test);
  }

  function endTest() {
    setActiveTest(null);
    setActive(null);
    goto('#/');
  }

  // 代號會用在檔名與資料夾名稱，所以去掉斜線、反斜線、底線與空白。
  function changeCode(value) {
    const clean = value.replace(/[\\/_\s]/g, '').slice(0, 12);
    setSeat(clean);
    localStorage.setItem(CODE_KEY, clean);
  }

  // 紀錄只在本機；匯出為 ZIP（CSV＋全部字跡 PNG），由老師自行保存。
  function exportAll() {
    const zip = makeZip(exportFiles(loadRecords()));
    const url = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `強制回憶紀錄-${seat || '未填'}-${new Date().toISOString().slice(0, 10)}.zip`;
    link.click();
    URL.revokeObjectURL(url);
    markExported();
    setExportedAt(getExportedAt());
  }

  // 測驗進行中：整個畫面只剩作答，沒有切換頁面、匯出或任何範字。
  if (activeTest) {
    return (
      <main>
        <header>
          <h1>測驗</h1>
          <div className="head-tools">
            <span className="seat">代號 {seat || '未填'}</span>
            <FullscreenButton />
          </div>
        </header>
        {lessons ? (
          <TestRunner lessons={lessons.retention} seat={seat} test={activeTest} onExit={endTest} />
        ) : (
          <p role="status">{loadError || '正在載入…'}</p>
        )}
      </main>
    );
  }

  if (loadError) return <main><p role="alert" className="warn">{loadError}</p></main>;
  if (!lessons) return <main><p role="status">正在載入教材…</p></main>;

  const lesson = route.n ? lessons.practice.find((l) => l.number === route.n) : null;

  // 上課簡報：投影用，全畫面
  if (route.page === 'present' && lesson) {
    const base = window.location.href.split('#')[0];
    return <Presenter key={lesson.id} lesson={lesson} parts={parts} practiceUrl={`${base}#/${lesson.number}/practice`} onExit={() => goto('#/')} />;
  }

  const title = route.page === 'practice' && lesson ? `第 ${lesson.number} 節　練習`
    : route.page === 'test' ? '保留／追蹤測驗'
      : route.page === 'teacher' ? '老師' : '「字」從心生　強制回憶寫字';

  const header = (
    <header>
      <div className="head-left">
        {route.page !== 'home' && <button type="button" className="back" onClick={() => goto('#/')}>首頁</button>}
        <h1>{title}</h1>
      </div>
      <div className="head-tools">
        <label className="seat">
          代號
          <input value={seat} onChange={(e) => changeCode(e.target.value)} placeholder="例如 7" />
        </label>
        <FullscreenButton />
      </div>
    </header>
  );

  const reminder = unexported >= EXPORT_REMIND_EVERY && route.page !== 'practice' && (
    <p role="status" className="reminder">
      已有 {unexported} 筆紀錄尚未匯出，建議到「老師」頁按「匯出紀錄（含字跡）」備份。
      {exportedAt && <span>上次匯出：{new Date(exportedAt).toLocaleString('zh-TW')}</span>}
    </p>
  );

  let body;
  if (route.page === 'practice' && lesson) {
    body = seat ? (
      <ForcedRecall
        key={lesson.id}
        lessons={[lesson]}
        parts={parts}
        seat={seat}
        onFinished={() => startTest({ lessonId: `T${lesson.number}-immediate`, mode: 'teacher', delay: 'immediate', entryIndex: 0, startedAt: new Date().toISOString() })}
      />
    ) : (
      <section className="panel stage">
        <h2>請先輸入你的代號</h2>
        <input className="code-big" value={codeDraft} onChange={(e) => setCodeDraft(e.target.value)} placeholder="例如 7" />
        <button type="button" className="primary big" disabled={!codeDraft.trim()} onClick={() => changeCode(codeDraft)}>開始練習</button>
      </section>
    );
  } else if (route.page === 'test') {
    body = <TestSetup lessons={lessons.retention} onStart={startTest} />;
  } else if (route.page === 'teacher') {
    body = (
      <div className="teacher-page">
        <section className="panel stage">
          <button type="button" className="primary" onClick={exportAll}>匯出這台裝置的紀錄（含字跡）</button>
        </section>
        <Grade />
        <Merge />
      </div>
    );
  } else {
    body = <Home lessons={lessons} />;
  }

  return (
    <main>
      {header}
      {reminder}
      {body}
    </main>
  );
}
