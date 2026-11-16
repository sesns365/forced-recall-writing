import { useEffect, useRef, useState } from 'react';
import Pad from './Pad.jsx';
import LessonPicker from './LessonPicker.jsx';
import { DELAYS, targetOf, zhuyinOf, lessonLabel, intervalDays } from './logic.js';
import { addRetention, loadRecords, getActiveTest, setActiveTest } from './records.js';
import { speak } from './speech.js';
import { ZhuyinColumn } from './Zhuyin.jsx';

const HOLD_MS = 3000;

// 測驗設定：老師選組別、方式後按「開始測驗」。測驗中畫面鎖定（見 TestRunner）。
export function TestSetup({ lessons, onStart }) {
  const [lessonIndex, setLessonIndex] = useState(0);
  const [mode, setMode] = useState('teacher');
  const [delay, setDelay] = useState(lessons[0]?.delay ?? 'immediate');

  function choose(index) {
    setLessonIndex(index);
    if (lessons[index].delay) setDelay(lessons[index].delay);
  }

  if (!lessons.length) return <p>沒有測驗資料。</p>;
  return (
    <section className="panel">
      <h2>測驗設定（老師）</h2>
      <LessonPicker lessons={lessons} value={lessonIndex} showTitle={false} onChange={choose} />
      <div className="row">
        <label>
          方式
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="teacher">老師唸題（全班一起）</option>
            <option value="listen">平板唸題（個別施測）</option>
            <option value="zhuyin">看注音寫字</option>
          </select>
        </label>
        <label>
          類型
          <select value={delay} onChange={(e) => setDelay(e.target.value)}>
            {DELAYS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </label>
      </div>
      <p className="hint">開始後會鎖定畫面：學生只能作答，不能回到練習或看範字。寫完由老師在「老師」頁批改。</p>
      <button
        type="button"
        className="primary big"
        onClick={() => onStart({ lessonId: lessons[lessonIndex].id, mode, delay, entryIndex: 0, startedAt: new Date().toISOString() })}
      >開始測驗</button>
    </section>
  );
}

// 測驗進行中：只有作答畫面，沒有任何範字、課名或切換按鈕。
export function TestRunner({ lessons, seat, test, onExit }) {
  const [current, setCurrent] = useState(test);
  const [message, setMessage] = useState('');
  const [holding, setHolding] = useState(false);
  const padRef = useRef(null);
  const holdTimer = useRef(null);

  const lesson = lessons.find((l) => l.id === current.lessonId);
  const entry = lesson?.entries[current.entryIndex];
  const finished = !entry;

  useEffect(() => () => clearTimeout(holdTimer.current), []);

  // 聽寫：每換一題自動報讀一次（學生也可以按「聽題目」再聽）
  useEffect(() => {
    if (entry && current.mode === 'listen') speak(entry.word);
  }, [current.entryIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  function next(blank) {
    const pad = padRef.current;
    const at = new Date().toISOString();
    const char = targetOf(entry);
    const hasInk = !blank && pad?.hasInk();
    try {
      addRetention({
        id: crypto.randomUUID(),
        at,
        seat,
        lesson: lessonLabel(lesson),
        char,
        word: entry.word,
        delay: current.delay,
        mode: current.mode,
        result: hasInk ? null : 'blank', // 有寫的等老師批改；空白直接記為空白
        intervalDays: intervalDays(loadRecords().sessions, char, at),
        png: hasInk ? pad.png() : null,
      });
    } catch {
      setMessage('儲存失敗，請老師先匯出紀錄。');
      return;
    }
    const updated = { ...current, entryIndex: current.entryIndex + 1 };
    setActiveTest(updated);
    setCurrent(updated);
    pad?.clear();
    setMessage('');
  }

  function startHold(e) {
    // 鎖定指標：按住期間手指稍微移動或按鈕變化，都不會被當成放開
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      setHolding(false);
      onExit();
    }, HOLD_MS);
  }

  function stopHold() {
    setHolding(false);
    clearTimeout(holdTimer.current);
  }

  if (!lesson) {
    return (
      <section className="panel stage">
        <p className="warn">找不到這個測驗，請老師結束測驗。</p>
        <button type="button" onClick={onExit}>結束測驗</button>
      </section>
    );
  }

  return (
    <section className="panel test-mode">
      {finished ? (
        <div className="stage">
          <h2>測驗完成！</h2>
          <p className="hint">請交給老師。</p>
          <button type="button" className="primary big" onClick={onExit}>回到首頁</button>
        </div>
      ) : (
        <div className="stage">
          <h2>測驗</h2>
          <p className="progress">第 {current.entryIndex + 1} ／ {lesson.entries.length} 題</p>
          {current.mode === 'teacher' ? (
            <p className="cue">請聽老師唸第 {current.entryIndex + 1} 題</p>
          ) : current.mode === 'zhuyin' ? (
            <p className="cue">字音 <ZhuyinColumn text={zhuyinOf(entry) ?? entry.pinyin} className="zy-cue" /></p>
          ) : (
            <button type="button" className="big" onClick={() => speak(entry.word)}>聽題目</button>
          )}
          <div className="visual"><Pad padRef={padRef} /></div>
          <div className="row">
            <button type="button" className="primary big" onClick={() => next(false)}>寫好了，下一題</button>
            <button type="button" onClick={() => next(true)}>想不起來</button>
            <button type="button" onClick={() => padRef.current.clear()}>擦掉重寫</button>
          </div>
        </div>
      )}
      {message && <p role="alert" className="warn">{message}</p>}
      {!finished && (
        <button
          type="button"
          className={'teacher-exit' + (holding ? ' holding' : '')}
          onPointerDown={startHold}
          onPointerUp={stopHold}
          onPointerCancel={stopHold}
        >{holding ? '繼續按住…' : '老師結束（按住 3 秒）'}</button>
      )}
    </section>
  );
}

export { getActiveTest };
