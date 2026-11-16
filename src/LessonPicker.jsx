import { lessonLabel } from './logic.js';

// showTitle=false 時不顯示課名（課名可能含目標字，測驗時要隱藏）。
export default function LessonPicker({ lessons, value, onChange, showTitle = true }) {
  return (
    <label className="lesson-picker">
      課次
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {lessons.map((lesson, i) => (
          <option key={lesson.id} value={i}>
            {showTitle ? lessonLabel(lesson) : (lesson.testLabel ?? `${lesson.bookId} 第${lesson.number}課`)}（{lesson.entries.length} 字）
          </option>
        ))}
      </select>
    </label>
  );
}
