import { useEffect, useRef, useState } from 'react';
import Pad from './Pad.jsx';
import StrokeView from './StrokeView.jsx';
import StrokeWriter from './StrokeWriter.jsx';
import PartsPaint from './PartsPaint.jsx';
import PartsAssemble from './PartsAssemble.jsx';
import PracticeWrite from './PracticeWrite.jsx';
import { WordZhuyin, ZhuyinColumn } from './Zhuyin.jsx';
import StepStrip, { STEPS } from './StepStrip.jsx';
import LessonPicker from './LessonPicker.jsx';
import {
  ATTEMPTS, OBSERVE_SECONDS, targetOf, zhuyinOf, sentenceText, partsFor, checkCoverage, lessonLabel, speakableMnemonic,
} from './logic.js';
import { loadStrokes } from './data.js';
import { addSession } from './records.js';
import { speak } from './speech.js';

const PEEK_SECONDS = 3;

// 五大步驟：① 讀（字音、語詞、情境句）→ ② 拆（部件＋口訣）→ ③ 看（記住字形）
// → ④ 蓋（遮住連寫 4 遍，中間不回饋）→ ⑤ 對（揭開核對，有錯再訂正）
export default function ForcedRecall({ lessons, parts, seat, onFinished }) {
  const [lessonIndex, setLessonIndex] = useState(0);
  const [entryIndex, setEntryIndex] = useState(0);
  const [step, setStep] = useState('learn');
  const [sub, setSub] = useState(0);
  const [subDone, setSubDone] = useState({});
  const [guidedCount, setGuidedCount] = useState(0);
  const [hasInk, setHasInk] = useState(false);
  const [peekLeft, setPeekLeft] = useState(0); // 「忘記了」：看範字倒數
  const [peeks, setPeeks] = useState(0); // 這一遍看了幾次範字
  const [stroke, setStroke] = useState(null);
  const [strokeError, setStrokeError] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [selfJudge, setSelfJudge] = useState([]);
  const [correction, setCorrection] = useState(null);
  const [left, setLeft] = useState(OBSERVE_SECONDS);
  const [message, setMessage] = useState('');
  const padRef = useRef(null);

  const lesson = lessons[lessonIndex];
  const entry = lesson?.entries[entryIndex];
  const char = entry ? targetOf(entry) : '';
  const info = parts?.[char] ?? {};
  const partList = partsFor(parts, char);
  const coverage = partList && stroke ? checkCoverage(partList, stroke.strokes.length) : null;
  const zhuyin = entry ? zhuyinOf(entry) : null;
  // 第 ② 步的小步驟：看筆順 →（有部件資料時）拆部件 → 組部件 → 練習寫 3 次（至少完成 1 次跟著筆順寫）
  const SUBS = [['watch', '看筆順'], ...(partList ? [['paint', '拆部件'], ['assemble', '組部件']] : []), ['practice', '練習寫']];
  const subKey = SUBS[sub]?.[0];
  const practiceIdx = SUBS.findIndex(([k]) => k === 'practice');
  // 進入練習寫後，不能回到前面的小步驟；至少完成 1 次跟著筆順寫才能進入「看」
  const lockedBefore = sub >= practiceIdx ? practiceIdx : -1;
  const nextBlocked = subKey === 'practice' && guidedCount < 1;
  // 「對」：每一遍寫出來的字都要自我檢核後，才能進入下一個字
  const judgedAll = attempts.every((a, i) => a.blank || selfJudge[i]);
  const needsCorrection = selfJudge.includes('diff') || attempts.some((a) => a.blank);

  // 換字：重設流程，並載入筆順資料
  useEffect(() => {
    setStep('learn');
    setSub(0);
    setSubDone({});
    setGuidedCount(0);
    setHasInk(false);
    setAttempts([]);
    setPeekLeft(0);
    setPeeks(0);
    setSelfJudge([]);
    setCorrection(null);
    setLeft(OBSERVE_SECONDS);
    setMessage('');
    setStroke(null);
    setStrokeError('');
    if (!char) return undefined;
    let live = true;
    loadStrokes(char)
      .then((data) => live && setStroke(data))
      .catch((error) => live && setStrokeError(error.message));
    return () => { live = false; };
  }, [lessonIndex, entryIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // 忘記了：範字顯示倒數，時間到自動遮回去
  useEffect(() => {
    if (peekLeft <= 0) return undefined;
    const timer = setTimeout(() => setPeekLeft((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [peekLeft]);

  // 觀察倒數：時間到自動遮住，進入回想
  useEffect(() => {
    if (step !== 'observe') return undefined;
    if (left <= 0) {
      setStep('recall');
      return undefined;
    }
    const timer = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, left]);

  function chooseLesson(index) {
    setLessonIndex(index);
    setEntryIndex(0);
  }

  function startObserve() {
    setLeft(OBSERVE_SECONDS);
    setStep('observe');
  }

  function finishAttempt(explicitBlank) {
    const pad = padRef.current;
    const blank = explicitBlank || !pad.hasInk();
    const next = [...attempts, { png: blank ? null : pad.png(), blank, peeks }];
    setAttempts(next);
    setPeeks(0);
    setPeekLeft(0);
    pad.clear();
    if (next.length >= ATTEMPTS) {
      setSelfJudge(next.map((a) => (a.blank ? 'diff' : null)));
      setStep('check');
    }
  }

  function goNext() {
    if (entryIndex + 1 < lesson.entries.length) {
      setEntryIndex(entryIndex + 1);
    } else {
      setStep('done');
    }
  }

  function save() {
    try {
      addSession({
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        seat,
        lesson: lessonLabel(lesson),
        char,
        word: entry.word,
        partsMissingStrokes: coverage ? coverage.missing.length : null,
        attempts: attempts.map((a, i) => ({ png: a.png, blank: a.blank, self: selfJudge[i], peeks: a.peeks ?? 0 })),
        correction,
      });
      goNext();
    } catch {
      setMessage('儲存失敗，瀏覽器儲存空間可能已滿，請先按「匯出紀錄（含字跡）」。');
    }
  }

  function finishCorrection() {
    const pad = padRef.current;
    setCorrection(pad.hasInk() ? pad.png() : null);
    setStep('check');
  }

  if (!lesson) return <p>資料尚未載入。</p>;

  const mnemonicBlock = info.mnemonic && (
    <div className="row mnemonic">
      <p className="mnemonic-text">口訣：{info.mnemonic}</p>
      <button type="button" onClick={() => speak(speakableMnemonic(info.mnemonic))}>唸口訣</button>
    </div>
  );

  return (
    <section className="panel">
      {/* 課名可能含目標字，所以只在第 1 步顯示課次選單 */}
      {step === 'learn' && lessons.length > 1 && <LessonPicker lessons={lessons} value={lessonIndex} onChange={chooseLesson} />}
      {step !== 'done' && (
        <div className="progress-row">
          <p className="progress">第 {entryIndex + 1} ／ {lesson.entries.length} 字</p>
          {/* 步驟名稱若剛好是目標字（例如「蓋」），回想時不顯示步驟列，避免目標字出現在畫面上 */}
          {!(step === 'recall' && STEPS.some((x) => x.name === char)) && (
            <StepStrip current={{ learn: 0, parts: 1, observe: 2, recall: 3, check: 4, correct: 4 }[step]} />
          )}
        </div>
      )}

      {step === 'learn' && (
        <div className="stage">
          <h2>① 讀</h2>
          <p className="word"><WordZhuyin word={entry.word} pinyin={entry.pinyin} targetIdx={entry.targetIdx} /></p>
          <p className="sentence">{sentenceText(entry, true)}</p>
          <div className="row">
            <button type="button" onClick={() => speak(entry.word)}>報讀語詞</button>
            <button type="button" onClick={() => speak(sentenceText(entry, true))}>報讀句子</button>
          </div>
          <button type="button" className="primary big" onClick={() => { setSub(0); setStep('parts'); }}>下一步</button>
        </div>
      )}

      {step === 'parts' && (
        <div className="stage">
          <h2>② 拆</h2>
          <div className="row substeps" role="tablist" aria-label="拆的小步驟">
            {SUBS.map(([key, text], i) => (
              <button key={key} type="button" role="tab" aria-selected={i === sub} className={i === sub ? 'primary' : ''} disabled={i < lockedBefore} onClick={() => setSub(i)}>
                {subDone[key] ? '⭐' : `${i + 1}.`} {text}
              </button>
            ))}
          </div>
          {strokeError && <p role="alert" className="warn">{strokeError}</p>}
          {!stroke && !strokeError && <p role="status">正在載入筆順…</p>}
          {stroke && subKey === 'watch' && (
            <StrokeWriter key="watch" data={stroke} mode="watch" onDone={() => setSubDone((d) => ({ ...d, watch: true }))} />
          )}
          {stroke && subKey === 'practice' && (
            <PracticeWrite
              data={stroke}
              char={char}
              onGuided={() => setGuidedCount((n) => n + 1)}
              onDone={() => setSubDone((d) => ({ ...d, practice: true }))}
            />
          )}
          {stroke && subKey === 'paint' && (
            <PartsPaint data={stroke} partList={partList} onDone={() => setSubDone((d) => ({ ...d, paint: true }))} />
          )}
          {stroke && subKey === 'assemble' && (
            <PartsAssemble data={stroke} partList={partList} onDone={() => setSubDone((d) => ({ ...d, assemble: true }))} />
          )}
          {partList && (subKey === 'paint' || subKey === 'assemble') && (
            <p className="parts-line">{partList.map((p) => p.label).join('　＋　')}</p>
          )}
          {(subKey === 'paint' || subKey === 'assemble') && mnemonicBlock}
          {subKey === 'watch' && info.video && (
            <a className="video" href={info.video} target="_blank" rel="noopener noreferrer">看每日一字動畫</a>
          )}
          {subKey === 'paint' && info.tips && <p className="tips">注意：{info.tips}</p>}
          {subKey === 'paint' && <p className="hint">眼看部件、手寫部件、口唸口訣。</p>}
          <button
            type="button"
            className="primary big"
            disabled={nextBlocked}
            onClick={() => (sub + 1 < SUBS.length ? setSub(sub + 1) : startObserve())}
          >下一步</button>
          {nextBlocked && <p className="hint">先完成一次「跟著筆順寫」，才能進入下一步。</p>}
          {subKey === 'practice' && <p className="hint">進入練習寫後，不能回到前面的步驟。</p>}
        </div>
      )}

      {step === 'observe' && (
        <div className="stage">
          <h2>③ 看</h2>
          <p role="status" className="countdown">{left} 秒後遮起來</p>
          <div className="visual"><StrokeView data={stroke} fallbackChar={char} /></div>
          {info.tips && <p className="tips">注意：{info.tips}</p>}
          {strokeError && <p role="alert" className="warn">{strokeError}</p>}
          <button type="button" className="primary big" onClick={() => setLeft(0)}>記住了，遮起來</button>
        </div>
      )}

      {step === 'recall' && (
        <div className="stage">
          {/* 步驟名「蓋」：練「蓋」字時改用「遮」，避免目標字出現在畫面上 */}
          <h2>{char === '蓋' ? '④ 遮' : '④ 蓋'}</h2>
          <p className="progress">第 {attempts.length + 1} 遍，共 {ATTEMPTS} 遍</p>
          {/* 已寫的遍數只顯示打勾，不顯示字跡（蓋住自己寫過的字） */}
          <div className="practice-slots covered" aria-label={`已寫 ${attempts.length} 遍`}>
            {Array.from({ length: ATTEMPTS }, (_, i) => (
              <div key={i} className={'slot' + (i < attempts.length ? ' slot-done' : i === attempts.length ? ' slot-now' : '')}>
                {i < attempts.length ? '✓' : i + 1}
              </div>
            ))}
          </div>
          <p className="cue">字音 <ZhuyinColumn text={zhuyin ?? entry.pinyin} className="zy-cue" /></p>
          <p className="sentence">
            {sentenceText(entry, false)}
            <button type="button" className="speak-icon" aria-label="報讀句子" onClick={() => speak(sentenceText(entry, true))}>🔊</button>
          </p>
          <div className="visual peek-wrap">
            <Pad padRef={padRef} onInkChange={setHasInk} />
            {/* 忘記了：範字蓋在書寫格上 3 秒，書寫格的筆畫保留 */}
            {peekLeft > 0 && (
              <div className="peek-over" aria-live="polite">
                <StrokeView data={stroke} fallbackChar={char} />
                <span className="peek-count">{peekLeft}</span>
              </div>
            )}
          </div>
          <div className="row">
            <button type="button" className="big primary" disabled={!hasInk || peekLeft > 0} onClick={() => finishAttempt(false)}>寫好了，遮起來</button>
            <button type="button" disabled={peekLeft > 0} onClick={() => { setPeeks((n) => n + 1); setPeekLeft(PEEK_SECONDS); }}>忘記了（看 3 秒）</button>
            <button type="button" onClick={() => padRef.current.clear()}>擦掉重寫</button>
          </div>
        </div>
      )}

      {step === 'check' && (
        <div className="stage">
          <h2>⑤ 對</h2>
          <div className="visual"><p className="target-big kai">{char}</p></div>
          <div className="attempts">
            {attempts.map((a, i) => (
              <figure key={i}>
                {a.blank ? <div className="blank">空白</div> : <img src={a.png} alt={`第 ${i + 1} 遍`} />}
                <figcaption>第 {i + 1} 遍{a.peeks ? `（看了 ${a.peeks} 次）` : ''}</figcaption>
                {!a.blank && (
                  <div className="row">
                    <button
                      type="button"
                      aria-pressed={selfJudge[i] === 'same'}
                      onClick={() => setSelfJudge(selfJudge.map((v, j) => (j === i ? 'same' : v)))}
                    >✓ 一樣</button>
                    <button
                      type="button"
                      aria-pressed={selfJudge[i] === 'diff'}
                      onClick={() => setSelfJudge(selfJudge.map((v, j) => (j === i ? 'diff' : v)))}
                    >✗ 不一樣</button>
                  </div>
                )}
              </figure>
            ))}
          </div>
          {correction && (
            <figure className="correction">
              <img src={correction} alt="訂正" />
              <figcaption>訂正</figcaption>
            </figure>
          )}
          <p className="hint">{judgedAll ? '一筆一筆對照範字。寫錯沒關係，訂正就好。' : '每一遍都要按「一樣」或「不一樣」，才能進入下一個字。'}</p>
          <div className="row">
            {needsCorrection && !correction && (
              <button type="button" className="big" onClick={() => setStep('correct')}>訂正</button>
            )}
            <button type="button" className="primary big" disabled={!judgedAll} onClick={save}>完成，下一個字</button>
          </div>
        </div>
      )}

      {step === 'correct' && (
        <div className="stage">
          <h2>訂正</h2>
          <div className="visual correct-pair">
            <p className="target-big kai">{char}</p>
            <Pad padRef={padRef} />
          </div>
          {partList && <p className="parts-line">{partList.map((p) => p.label).join('　＋　')}</p>}
          {mnemonicBlock}
          <p className="hint">重新拆部件、唸口訣，再寫一次。</p>
          <div className="row">
            <button type="button" className="primary big" onClick={finishCorrection}>訂正好了</button>
            <button type="button" onClick={() => padRef.current.clear()}>擦掉重寫</button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="stage">
          <h2>⭐ 這一節的 {lesson.entries.length} 個字都完成了！</h2>
          {onFinished ? (
            <>
              <p className="hint">接下來是隨堂測驗：開始後不能回來看字，聽老師唸題目再寫。</p>
              <button type="button" className="primary big" onClick={onFinished}>開始隨堂測驗</button>
            </>
          ) : (
            <p className="hint">練習結束。測驗請老師按上方「測驗」開始。</p>
          )}
          <button type="button" onClick={() => { setEntryIndex(0); setStep('learn'); }}>從頭再練一次</button>
        </div>
      )}

      {message && <p role="status" className="message">{message}</p>}
    </section>
  );
}
