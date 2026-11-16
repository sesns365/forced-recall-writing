"""準備線上網站的 public/ 資源：教材資料、24 字筆順、裁切後的楷書字型、情境圖。

用法：python3 tools/site.py（之後 npm run build；GitHub Actions 只跑 build，所以 public/ 要一起提交）
情境圖放在 resources/scenes/1.jpg～6.jpg（16:9）。
"""
import io
import json
import re
import shutil
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import action_plan  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
RES = ROOT / 'resources'
PLAN = ROOT / 'action-plan'


def main():
    action_plan.build()
    data_dir = PUBLIC / 'data'
    data_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy(PLAN / 'lessons-all.json', data_dir / 'lessons.json')
    shutil.copy(PLAN / 'parts.json', data_dir / 'parts.json')

    # 筆順：只放 24 個目標字
    strokes_dir = PUBLIC / 'strokes'
    if strokes_dir.exists():
        shutil.rmtree(strokes_dir)
    strokes_dir.mkdir()
    chars = [c[0] for lesson in action_plan.LESSONS for c in lesson['chars']]
    for char in chars:
        name = f'{ord(char):X}.json'
        shutil.copy(RES / 'strokes' / name, strokes_dir / name)

    # 情境圖
    scenes = PUBLIC / 'scenes'
    scenes.mkdir(exist_ok=True)
    for n in range(1, 7):
        src = RES / 'scenes' / f'{n}.jpg'
        if src.exists():
            shutil.copy(src, scenes / f'{n}.jpg')

    # 字型：只保留網站會出現的字（程式碼、教材資料、首頁）
    text = set()
    for f in list((ROOT / 'src').glob('*.js*')) + [ROOT / 'index.html', data_dir / 'lessons.json', data_dir / 'parts.json']:
        text |= set(f.read_text(encoding='utf-8'))
    text |= set(chr(c) for c in range(0x20, 0x7F))
    text |= set('，。、；：？！「」『』（）《》〈〉…—～・□＿　①②③④⑤⭐✓✗○△×')
    text |= set('ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦˊˇˋ˙')
    text = {c for c in text if not re.match(r'\s', c) or c == ' '}
    font = TTFont(RES / 'fonts' / 'moe-standard-kai-5.1.ttf')
    options = subset.Options()
    options.flavor = 'woff2'
    sub = subset.Subsetter(options)
    sub.populate(text=''.join(sorted(text)))
    sub.subset(font)
    buf = io.BytesIO()
    font.flavor = 'woff2'
    font.save(buf)
    fonts = PUBLIC / 'fonts'
    fonts.mkdir(exist_ok=True)
    (fonts / 'moe-kai-subset.woff2').write_bytes(buf.getvalue())
    print(f'網站資源：{len(chars)} 字筆順、字型 {len(buf.getvalue()) / 1e3:.0f} KB（{len(text)} 字）')


if __name__ == '__main__':
    main()
