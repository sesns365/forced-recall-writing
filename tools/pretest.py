"""產生前測／後測紙本單（聽寫，24 字）：學生作答單＋教師施測與計分表，輸出 HTML 與 PDF。

題目順序固定打散（同一份用於前測與後測，才能前後比較）。
"""
import base64
import io
import random
import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import action_plan  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'dist-pack' / '強制回憶寫字_六節教材包' / '前測後測紙本單'


def items():
    rows = []
    for lesson in action_plan.LESSONS:
        for char, word, pinyin, *_ in lesson['chars']:
            rows.append({'char': char, 'word': word, 'zhuyin': pinyin.split()[word.index(char)], 'n': lesson['n']})
    rng = random.Random(20261116)
    # 打散，並避免同一節的字相鄰
    while True:
        rng.shuffle(rows)
        if all(rows[i]['n'] != rows[i + 1]['n'] for i in range(len(rows) - 1)):
            return rows


def font_face(text):
    font = TTFont(ROOT / 'resources' / 'fonts' / 'moe-standard-kai-5.1.ttf')
    options = subset.Options()
    options.flavor = 'woff2'
    sub = subset.Subsetter(options)
    sub.populate(text=text)
    sub.subset(font)
    buf = io.BytesIO()
    font.flavor = 'woff2'
    font.save(buf)
    data = base64.b64encode(buf.getvalue()).decode('ascii')
    return f"@font-face{{font-family:MOEKai;src:url(data:font/woff2;base64,{data}) format('woff2')}}"


CSS = """
@page{size:A4;margin:12mm 14mm}
*{box-sizing:border-box}
body{font-family:MOEKai,'DFKai-SB','BiauKai',serif;color:#000;margin:0}
.page{page-break-after:always}
.page:last-child{page-break-after:auto}
h1{font-size:20pt;font-weight:400;text-align:center;margin:0 0 3mm}
.meta{display:flex;justify-content:space-between;font-size:13pt;margin:0 0 3mm;gap:4mm}
.meta span{white-space:nowrap}
.note{font-size:11pt;margin:0 0 4mm;line-height:1.5}
.grid{display:grid;grid-template-columns:repeat(5,32mm);column-gap:4mm;row-gap:5mm;justify-content:center}
.cell{text-align:center}
.num{font-size:13pt;font-weight:700;height:6mm}
.box{width:32mm;height:32mm;border:1.2pt solid #c00;position:relative}
.box::before,.box::after{content:'';position:absolute;border:0 dashed #e88}
.box::before{left:50%;top:0;bottom:0;border-left-width:.6pt}
.box::after{top:50%;left:0;right:0;border-top-width:.6pt}
table{border-collapse:collapse;width:100%;font-size:11pt}
th,td{border:.8pt solid #333;padding:.7mm 1.5mm;text-align:center}
th{background:#eee}
td.say{text-align:left}
td.ans{font-size:15pt;line-height:1.1}
.sum{margin-top:3mm}
.small{font-size:10pt;color:#333;line-height:1.5}
h3{font-size:12.5pt;font-weight:400;margin:3mm 0 2mm;border-left:3pt solid #333;padding-left:2mm}
.reading{display:grid;grid-template-columns:repeat(4,1fr);gap:.8mm 3mm;list-style:none;padding:0;margin:0 0 2mm;font-size:10.5pt}
.reading b{display:inline-block;min-width:5mm}
table.score tr.lesson th{background:#ddd;text-align:left}
table.score tr.subtotal td{background:#f5f5f5}
td.wide{width:30%}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:3mm}
table.compact td{padding:.45mm 1.5mm;font-size:10.5pt}
table.compact td.ans{font-size:13pt;line-height:1}
table.compact th{padding:.6mm 1.5mm}
td.big{font-size:14pt;padding:2.2mm 2mm}
"""


SYMBOL_NOTE = '計分同評量紀錄表：○ 正確（完全正確）、△ 部分正確、× 錯誤、空白。'


def say(r):
    return f'{r["char"]}，{r["word"]}的{r["char"]}，{r["char"]}'


def student_page(title, groups, note):
    """groups: [(組名或 None, rows)]；題號跨組連續。"""
    parts, num = [], 1
    for label, rows in groups:
        cells = ''.join(f'<div class="cell"><div class="num">{num + i}</div><div class="box"></div></div>'
                        for i in range(len(rows)))
        num += len(rows)
        head = f'<h3>{label}</h3>' if label else ''
        parts.append(f'{head}<div class="grid">{cells}</div>')
    return f"""<section class="page">
<h1>{title}</h1>
<p class="meta"><span>代號：＿＿＿＿</span><span>日期：＿＿年＿＿月＿＿日</span></p>
<p class="note">{note}</p>
{''.join(parts)}
</section>"""


def reading_list(rows):
    cells = ''.join(f'<li><b>{i}</b>　{say(r)}</li>' for i, r in enumerate(rows, 1))
    return f'<ol class="reading">{cells}</ol>'


def pretest_teacher_page(rows):
    by_lesson = []
    for lesson in action_plan.LESSONS:
        mine = [(i, r) for i, r in enumerate(rows, 1) if r['n'] == lesson['n']]
        mine.sort(key=lambda t: [c[0] for c in lesson['chars']].index(t[1]['char']))
        body = ''.join(f'<tr><td>{i}</td><td class="ans">{r["char"]}</td><td>{r["word"]}</td><td>{r["zhuyin"]}</td>'
                       '<td></td><td></td><td class="wide"></td></tr>' for i, r in mine)
        by_lesson.append(
            f'<tr class="lesson"><th colspan="7">第 {lesson["n"]} 節（{lesson["strokes"]}）</th></tr>{body}'
            '<tr class="subtotal"><td colspan="4">本節 ○ 數</td><td>／4</td><td>／4</td><td></td></tr>')
    half = (len(rows) + 1) // 2
    def read_rows(sub, start):
        return ''.join(f'<tr><td>{start + i}</td><td class="say big">{say(r)}</td><td>□</td></tr>' for i, r in enumerate(sub))
    return f"""<section class="page">
<h1>聽寫唸讀順序（教師用）</h1>
<p class="meta"><span>代號：＿＿＿＿</span><span>□ 前測　□ 後測</span><span>日期：＿＿＿＿</span><span>施測者：＿＿＿＿</span></p>
<p class="small">照學生作答單的題號唸讀，每題唸「字，語詞的字，字」，間隔約 10 秒；不提示字形、不給注音。唸過的題目在右欄打勾。</p>
<div class="two-col">
<table class="score"><tr><th>題</th><th>唸讀</th><th>✓</th></tr>{read_rows(rows[:half], 1)}</table>
<table class="score"><tr><th>題</th><th>唸讀</th><th>✓</th></tr>{read_rows(rows[half:], half + 1)}</table>
</div>
</section>
<section class="page">
<h1>聽寫計分表（教師用，依節次排列）</h1>
<p class="meta"><span>代號：＿＿＿＿</span><span>前測日期：＿＿＿＿</span><span>後測日期：＿＿＿＿</span></p>
<p class="small">前測、後測欄填 ○ △ × 或空白；題號對照學生作答單。</p>
<table class="score compact">
<tr><th>題號</th><th>答案</th><th>語詞</th><th>注音</th><th>前測</th><th>後測</th><th>錯誤情形</th></tr>
{''.join(by_lesson)}
<tr class="subtotal"><td colspan="4">合計 ○ 數</td><td>／24</td><td>／24</td><td></td></tr>
</table>
<p class="small">{SYMBOL_NOTE}前測已寫對（○）的字，學生原本就會，建議換成同筆畫範圍、前測寫不出來的字，否則前後測比較會低估成效。後測使用同一張作答單、同一順序。</p>
</section>"""


def lesson_teacher_page(title, groups):
    blocks, num = [], 1
    for label, rows in groups:
        body = ''.join(f'<tr><td>{num + i}</td><td class="say">{say(r)}</td><td class="ans">{r["char"]}</td>'
                       f'<td>{r["zhuyin"]}</td><td></td><td></td><td></td><td></td><td class="wide"></td></tr>'
                       for i, r in enumerate(rows))
        num += len(rows)
        blocks.append(
            f'<tr class="lesson"><th colspan="9">{label}</th></tr>{body}'
            '<tr class="subtotal"><td colspan="4">○ 數　　／4　　實際間隔＿＿天</td><td colspan="5"></td></tr>')
    return f"""<section class="page">
<h1>{title}（教師用）</h1>
<p class="meta"><span>代號：＿＿＿＿</span><span>日期：＿＿＿＿</span><span>施測者：＿＿＿＿</span></p>
<p class="small">照題號唸讀，每題間隔約 10 秒；不提示字形、不給注音。{SYMBOL_NOTE}</p>
<table class="score">
<tr><th>題</th><th>唸讀</th><th>答案</th><th>注音</th><th>○</th><th>△</th><th>×</th><th>空白</th><th>錯誤情形</th></tr>
{''.join(blocks)}
</table>
</section>"""


def lesson_rows(n, seed):
    lesson = next(l for l in action_plan.LESSONS if l['n'] == n)
    rows = [{'char': c, 'word': w, 'zhuyin': p.split()[w.index(c)], 'n': n} for c, w, p, *_ in lesson['chars']]
    random.Random(seed).shuffle(rows)
    return rows


def write_sheet(path, title, pages_html):
    text = ''.join(sorted(set(re.sub(r'<[^>]+>', '', pages_html) + '0123456789／＿')))
    html = (f'<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><title>{title}</title>'
            f'<style>{font_face(text)}{CSS}</style></head><body>{pages_html}</body></html>')
    path.parent.mkdir(parents=True, exist_ok=True)
    html_path = path.with_suffix('.html')
    html_path.write_text(html, encoding='utf-8')
    return html_path


def to_pdf(html_paths):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        page = browser.new_page()
        for html_path in html_paths:
            page.goto(html_path.as_uri())
            page.wait_for_timeout(300)
            page.pdf(path=str(html_path.with_suffix('.pdf')), format='A4', prefer_css_page_size=True, print_background=True)
            html_path.unlink()  # 只留 PDF，方便直接列印
        browser.close()


def main(pack_root=ROOT / 'dist-pack' / '強制回憶寫字_六節教材包'):
    sheets = []
    rows = items()
    pre = student_page('「字」從心生　聽寫（□前測　□後測）', [(None, rows)],
                       '老師唸一個字，請把那個字寫在同一題號的格子裡。想不起來就空著，換下一題。')
    sheets.append(write_sheet(pack_root / '前測後測紙本單' / '前測後測_聽寫單', '前測後測聽寫單',
                              pre + pretest_teacher_page(rows)))

    def groups_for(retention, seed):
        out = []
        for m, d in retention:
            label = f'第 {m} 節（{action_plan.DELAY_NAME[d]}）'
            out.append((label, lesson_rows(m, seed * 10 + m)))
        return out

    note = '老師唸一個字，請寫在同一題號的格子裡。想不起來就空著。'
    for lesson in action_plan.LESSONS:
        n = lesson['n']
        folder = pack_root / f'第{n}節_{"".join(c[0] for c in lesson["chars"])}'
        groups = groups_for(lesson['retention'], n)
        title = f'第 {n} 節　課後測驗'
        sheets.append(write_sheet(folder / f'第{n}節_課後測驗單', title,
                                  student_page(title, groups, note) + lesson_teacher_page(title, groups)))
    for k, follow in enumerate(action_plan.FOLLOW_UPS, 1):
        folder = pack_root / follow['folder']
        groups = groups_for(follow['retention'], 10 + k)
        title = f'{follow["name"]}'
        sheets.append(write_sheet(folder / f'{follow["name"]}_測驗單', title,
                                  student_page(title, groups, note) + lesson_teacher_page(title, groups)))
    to_pdf(sheets)
    print('前測順序：', ''.join(r['char'] for r in rows))


if __name__ == '__main__':
    main()
