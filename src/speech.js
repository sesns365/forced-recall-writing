// 報讀：使用瀏覽器內建的中文語音（zh-TW）。沒有語音時靜默略過。
export function speak(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-TW';
  utterance.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}
