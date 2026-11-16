import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { base64Bytes } from './data.js';
import './styles.css';

// 教育部標準楷書：單一 HTML 版用內嵌的裁切字型，開發版從 public/fonts 載入。
const embedded = document.getElementById('emb-font');
const source = embedded
  ? base64Bytes(embedded.textContent).buffer
  : `url(${import.meta.env.BASE_URL}fonts/moe-kai-subset.woff2)`;
new FontFace('MOEKai', source).load().then((font) => document.fonts.add(font)).catch(() => {});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
