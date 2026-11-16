"""產生「教學日程表」（A4 橫式 PDF）：每個日期要做什麼、開哪個檔案、測哪些字、要印哪些紙本。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import action_plan  # noqa: E402
import pretest  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PACK = ROOT / 'dist-pack' / '強制回憶寫字_六節教材包'

EXTRA_CSS = """<style>
@page{size:A4 landscape;margin:10mm 12mm}
table.plan{font-size:10.5pt}
table.plan td{text-align:left;vertical-align:top;padding:1.4mm 2mm;line-height:1.45}
table.plan td.date{white-space:nowrap;font-size:12pt;text-align:center}
table.plan tr{break-inside:avoid;page-break-inside:avoid}
table.plan tr.extra td{background:#f3f3f3}
table.plan ul{margin:0;padding-left:4.5mm}
</style>"""


def chars(n):
    lesson = next(l for l in action_plan.LESSONS if l['n'] == n)
    return '、'.join(c[0] for c in lesson['chars'])


def tests_text(retention):
    return '<br>'.join(f'第 {m} 節{action_plan.DELAY_NAME[d]}：{chars(m)}' for m, d in retention)


def rows():
    out = [(
        'extra', '11/16（一）<br>或 11/17 課前',
        '<b>前測</b>（聽寫 24 字）<br>看學生是否原本就會寫；已寫對的字建議換字。',
        '—（紙本）',
        '24 字全部',
        '<ul><li>前測後測_聽寫單 第 1 頁（學生作答單）：每生 1 張，勾「前測」</li>'
        '<li>第 2 頁唸讀順序：老師 1 張</li><li>第 3 頁計分表：每生 1 張（後測沿用同一張）</li></ul>',
    )]
    for lesson in action_plan.LESSONS:
        n = lesson['n']
        folder = f'第{n}節_{"".join(c[0] for c in lesson["chars"])}'
        note = '<br>首次上課：說明「寫一個、遮一個」規則' if n == 1 else ''
        if n == 6:
            note = '<br>課後到「老師」頁匯出紀錄'
        elif n in (2, 4):
            note = '<br>課後到「老師」頁匯出紀錄（每週備份）'
        out.append((
            '', action_plan.LESSON_DATES[n],
            f'<b>第 {n} 節</b>　{chars(n)}（{lesson["strokes"]}）<br>五大步驟練習＋課後測驗{note}',
            f'{folder}／第{n}節_強制回憶寫字.html<br>教學卡：第{n}節_教學卡.html',
            tests_text(lesson['retention']),
            f'<ul><li>第{n}節_課後測驗單 第 1 頁：每生 1 張</li><li>第 2 頁唸讀計分：每生 1 張</li>'
            f'<li>教學卡：老師 1 張（可選）</li></ul>',
        ))
    for follow in action_plan.FOLLOW_UPS:
        out.append((
            'extra', follow['date'],
            f'<b>{follow["name"]}</b>（保留測驗，不上新字）',
            f'{follow["folder"]}／{follow["name"]}_強制回憶寫字.html',
            tests_text(follow['retention']),
            f'<ul><li>{follow["name"]}_測驗單 第 1 頁：每生 1 張</li><li>第 2 頁唸讀計分：每生 1 張</li></ul>',
        ))
    out.append((
        'extra', action_plan.POSTTEST_DATE,
        '<b>後測</b>（聽寫 24 字，與前測同一張、同順序）<br>第 6 節 4 字的結果同時記為「第 6 節兩週保留」。<br>結束後匯出全部紀錄，用「匯入合併」整理。',
        '—（紙本）',
        '24 字全部',
        '<ul><li>前測後測_聽寫單 第 1 頁：每生 1 張，勾「後測」</li><li>第 2 頁唸讀順序：老師 1 張</li>'
        '<li>第 3 頁計分表：用前測那一張，填「後測」欄</li></ul>',
    ))
    return out


def main():
    body = ''.join(
        f'<tr class="{cls}"><td class="date">{date}</td><td>{what}</td><td>{file}</td><td>{test}</td><td>{paper}</td></tr>'
        for cls, date, what, file, test, paper in rows())
    html = f"""{EXTRA_CSS}<section class="page">
<h1>「字」從心生　教學日程表</h1>
<p class="small">固定每週二、四上課。保留間隔：一週保留相隔 7 天、兩週保留相隔 14 天。測驗可以用工具「測驗」頁，或用紙本測驗單（兩者擇一，內容相同）。</p>
<table class="score plan">
<tr><th>日期</th><th>內容</th><th>開啟的檔案</th><th>測驗內容</th><th>要印的紙本</th></tr>
{body}
</table>
</section>"""
    path = pretest.write_sheet(PACK / '教學日程表', '教學日程表', html)
    pretest.to_pdf([path])


if __name__ == '__main__':
    main()
