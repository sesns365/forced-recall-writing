"""把教材、筆順、部件資料與裁切後的楷書字型嵌入 dist-single/index.html，產生單一 HTML 檔。

用法：python3 tools/embed.py（在專案根目錄執行，需先 vite build --config vite.single.config.js）
"""
import base64
import gzip
import io
import json
import re
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
OUT_HTML = ROOT / 'dist-single' / 'index.html'


def gz_b64(obj):
    raw = json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    return base64.b64encode(gzip.compress(raw, 9)).decode('ascii')


def round_path(path):
    # 1024 格座標四捨五入成整數，肉眼看不出差別，可減少約兩成大小。
    return re.sub(r'-?\d+\.\d+', lambda m: str(round(float(m.group()))), path)


def main(lessons_path=PUBLIC / 'data' / 'lessons.json', parts_path=PUBLIC / 'data' / 'parts.json',
         final=ROOT / 'dist-single' / '強制回憶寫字.html', title='強制回憶寫字', keep_template=False):
    lessons = json.loads(Path(lessons_path).read_text(encoding='utf-8'))
    parts = json.loads(Path(parts_path).read_text(encoding='utf-8'))
    FINAL = Path(final)

    all_lessons = lessons if isinstance(lessons, list) else lessons['practice'] + lessons['retention']
    strokes = {}
    missing = []
    for lesson in all_lessons:
        for entry in lesson['entries']:
            char = list(entry['word'])[entry['targetIdx']]
            if char in strokes:
                continue
            file = ROOT / 'resources' / 'strokes' / f'{ord(char):X}.json'
            if not file.exists():
                missing.append(char)
                continue
            raw = json.loads(file.read_text())
            strokes[char] = {
                'strokes': [round_path(p) for p in raw['strokes']],
                'medians': [[[round(x), round(y)] for x, y in m] for m in raw['medians']],
            }

    # 字型只保留會出現的字：教材全部文字＋介面文字＋ASCII 與常用標點。
    text = set(json.dumps(lessons, ensure_ascii=False))
    text |= set(json.dumps(parts, ensure_ascii=False))
    for src in (ROOT / 'src').glob('*.js*'):
        text |= set(src.read_text(encoding='utf-8'))
    text |= set(chr(c) for c in range(0x20, 0x7F))
    text |= set('，。、；：？！「」『』（）《》〈〉…—～・□＿　ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦˊˇˋ˙')
    font = TTFont(ROOT / 'resources' / 'fonts' / 'moe-standard-kai-5.1.ttf')
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=''.join(sorted(text)))
    subsetter.subset(font)
    buffer = io.BytesIO()
    font.flavor = 'woff2'
    font.save(buffer)
    font_b64 = base64.b64encode(buffer.getvalue()).decode('ascii')

    licence = (PUBLIC / 'licenses').glob('*')
    notes = '\n'.join(f.read_text(encoding='utf-8', errors='ignore').strip() for f in sorted(licence) if f.is_file())

    blocks = '\n'.join([
        f'<script id="emb-lessons" type="application/octet-stream">{gz_b64(lessons)}</script>',
        f'<script id="emb-strokes" type="application/octet-stream">{gz_b64(strokes)}</script>',
        f'<script id="emb-font" type="application/octet-stream">{font_b64}</script>',
        '<!-- 部件與口訣：老師可用文字編輯器修改下面這段 JSON，格式見 README。 -->',
        f'<script id="emb-parts" type="application/json">{json.dumps(parts, ensure_ascii=False, indent=1)}</script>',
        f'<!--\n資料授權（字型與筆順來自中華民國教育部，僅供教學、非營利使用）：\n{notes.replace("--", "－－")}\n-->',
    ])

    html = OUT_HTML.read_text(encoding='utf-8')
    if '</body>' not in html:
        raise SystemExit('找不到 </body>')
    html = html.replace('<link rel="icon" href="./icon.svg" type="image/svg+xml" />', '')
    html = html.replace('</body>', blocks + '\n</body>', 1)
    html = html.replace('<title>強制回憶寫字</title>', f'<title>{title}</title>', 1)
    FINAL.parent.mkdir(parents=True, exist_ok=True)
    FINAL.write_text(html, encoding='utf-8')
    if not keep_template:
        OUT_HTML.unlink()

    print(f'字型 {len(buffer.getvalue()) / 1e6:.2f} MB（{len(text)} 字）')
    print(f'筆順 {len(strokes)} 字，缺 {len(missing)} 字 {missing[:10]}')
    print(f'輸出 {FINAL.name}：{FINAL.stat().st_size / 1e6:.2f} MB')


if __name__ == '__main__':
    main()
