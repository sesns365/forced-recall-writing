"""產生行動方案六節課教材包：每節一個資料夾，含練習工具（單一 HTML）與教學卡（可列印）。

用法：npm run build:pack（先建置單一 HTML 範本，再執行本程式）
"""
import html
import shutil
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import action_plan  # noqa: E402
import embed  # noqa: E402
import pretest  # noqa: E402
import schedule  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PLAN = ROOT / 'action-plan'
OUT = ROOT / 'dist-pack' / '強制回憶寫字_六節教材包'

CARD_CSS = """
body{font-family:'DFKai-SB','BiauKai','標楷體',serif;max-width:900px;margin:24px auto;padding:0 16px;color:#111}
h1{font-size:26px;margin:0 0 4px}h2{font-size:20px;border-bottom:2px solid #333;padding-bottom:4px;margin-top:24px}
.sub{color:#444;margin:0 0 12px}.sentence{font-size:24px;background:#f1f5f9;padding:10px 14px;border-radius:8px}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #555;padding:6px 8px;font-size:17px;vertical-align:top}
th{background:#e2e8f0}td.c{font-size:40px;text-align:center;width:64px}td.n{white-space:nowrap}
ol li{margin:4px 0;font-size:17px}.src{color:#555;font-size:13px;margin-top:24px}
@media print{a{color:#111;text-decoration:none}}
"""


def card(lesson, by_n):
    n = lesson['n']
    rows = []
    for char, word, pinyin, mnemonic, plist, tips, video in lesson['chars']:
        zy = pinyin.split()[word.index(char)]
        link = f'<a href="{video}">{video}</a>' if video else '（沒有影片）'
        rows.append(
            f'<tr><td class="c">{char}</td><td class="n">{zy}</td><td class="n">{word}</td>'
            f'<td>{"＋".join(p[0] for p in plist)}<br><b>{mnemonic}</b></td>'
            f'<td>{html.escape(tips)}</td><td>{link}</td></tr>'
        )
    cbm = '、'.join(c[2].split()[c[1].index(c[0])] for c in lesson['chars'])
    tests = []
    for m, delay in lesson['retention']:
        chars = '、'.join(c[0] for c in by_n[m]['chars'])
        tests.append(f'<li>{action_plan.DELAY_NAME[delay]}：第 {m} 節（{chars}）</li>')
    if n == 6:
        tests.append('<li>之後：12/8、12/10、12/15 追蹤測驗；12/17 後測（含第 6 節兩週保留）。見「教學日程表」。</li>')
    return f"""<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8">
<title>第{n}節 教學卡</title><style>{CARD_CSS}</style></head><body>
<h1>第 {n} 節　{'、'.join(c[0] for c in lesson['chars'])}</h1>
<p class="sub">上課日期：{action_plan.LESSON_DATES[n]}｜{lesson['strokes']}｜本節重點：{lesson['focus']}</p>
<h2>情境句</h2><p class="sentence">{lesson['sentence']}</p>
<h2>目標字</h2>
<table><tr><th>字</th><th>注音</th><th>造詞</th><th>部件與口訣</th><th>易錯點</th><th>每日一字</th></tr>
{''.join(rows)}</table>
<h2>五大步驟（練習工具：第{n}節_強制回憶寫字.html）</h2>
<ol><li>讀：字音、語詞、情境句（可報讀）</li>
<li>拆：看筆順（可播每日一字動畫）→ 跟著寫（筆順提示）→ 拆部件（塗色並唸口訣）→ 組部件</li>
<li>看：看清楚字形 5 秒，注意易錯點</li>
<li>蓋：蓋住範字與剛寫過的字，連寫 4 遍，中間不回饋</li>
<li>對：揭開對照，有錯就重新拆部件、唸口訣訂正</li></ol>
<h2>綜合活動：CBM 與保留評量（工具「測驗」頁，或紙本「第{n}節_課後測驗單.pdf」；每週兩節）</h2>
<ol><li>CBM 隨堂測驗（聽寫）：{cbm}</li>{''.join(tests)}</ol>
<p class="sub">測驗時學生只寫、不能回去看範字；老師之後在「老師」頁依評量紀錄表批改（○ △ × 空白）。工具自動記錄實際間隔天數。</p>
<p class="src">依據：陳淑麗、陳思涵、曾世杰（2023）。強制回憶寫字教學法對國小三年級寫字困難學生之介入成效。特殊教育研究學刊，48（3），67-97。</p>
</body></html>"""


def main():
    lessons = action_plan.build()
    by_n = {lesson['n']: lesson for lesson in lessons}
    if OUT.exists():
        shutil.rmtree(OUT)
    parts = PLAN / 'parts.json'
    for lesson in lessons:
        n = lesson['n']
        folder = OUT / f'第{n}節_{"".join(c[0] for c in lesson["chars"])}'
        embed.main(PLAN / f'lessons-{n}.json', parts, folder / f'第{n}節_強制回憶寫字.html',
                   title=f'第{n}節 強制回憶寫字', keep_template=True)
        (folder / f'第{n}節_教學卡.html').write_text(card(lesson, by_n), encoding='utf-8')
    for k, follow in enumerate(action_plan.FOLLOW_UPS, 1):
        folder = OUT / follow['folder']
        embed.main(PLAN / f'follow-{k}.json', parts, folder / f'{follow["name"]}_強制回憶寫字.html',
                   title=f'{follow["name"]} 強制回憶寫字', keep_template=True)
        items = ''.join(
            f'<li>{action_plan.DELAY_NAME[d]}：第 {m} 節（{"、".join(c[0] for c in by_n[m]["chars"])}）</li>'
            for m, d in follow['retention'])
        (folder / f'{follow["name"]}_說明.html').write_text(
            f'<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><title>{follow["name"]}</title>'
            f'<style>{CARD_CSS}</style></head><body><h1>{follow["name"]}</h1><p class="sub">日期：{follow["date"]}</p>'
            f'<h2>測驗內容（工具「測驗」頁）</h2><ol>{items}</ol>'
            '<p class="sub">學生只寫，不看範字；老師之後在「老師」頁看字跡批改（○ △ × 空白）。工具自動記錄實際間隔天數。</p>'
            '</body></html>', encoding='utf-8')
    embed.main(PLAN / 'lessons-all.json', parts, OUT / '六節全部_強制回憶寫字.html',
               title='強制回憶寫字（六節全部）', keep_template=False)
    pretest.main()
    schedule.main()
    zip_path = OUT.parent / f'{OUT.name}.zip'
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for file in sorted(OUT.rglob('*')):
            if file.is_file():
                zf.write(file, file.relative_to(OUT.parent))
    print(f'教材包：{zip_path.name}（{zip_path.stat().st_size / 1e6:.2f} MB）')


if __name__ == '__main__':
    main()
