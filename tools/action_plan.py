"""行動方案「「字」從心生」六節課的教材資料（來源：傅碧柔教案、陳淑麗等 2023）。

產生 action-plan/lessons-N.json、parts.json 供 embed.py 打包。
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'action-plan'

# 每節：情境句、本節重點；每字：(字, 語詞, 語詞注音, 口訣, 部件[(名稱, 起筆, 迄筆)], 易錯點, 每日一字影片)
LESSONS = [
    {
        'n': 1, 'focus': '建立「寫一個、蓋一個」遮蔽規則', 'strokes': '7～8 畫',
        'sentence': '投手研究股市，大家同心協力。',
        'chars': [
            ('投', '投手', 'ㄊㄡˊ ㄕㄡˇ', '手＋殳是投', [('扌', 0, 2), ('殳', 3, 6)],
             '「投」和「股」右邊都是「殳」，左邊分別是提手旁和月字旁。', None),
            ('究', '研究', 'ㄧㄢˊ ㄐㄧㄡˋ', '穴＋九是究', [('穴', 0, 4), ('九', 5, 6)],
             '下面是「九」，不是「丸」。', 'https://youtu.be/wQ5nm1LtyA4'),
            ('股', '股市', 'ㄍㄨˇ ㄕˋ', '月＋殳是股', [('月', 0, 3), ('殳', 4, 7)],
             '左邊是月字旁，右邊是「殳」，和「投」的右邊一樣。', 'https://youtu.be/ty7J3G7jE3o'),
            ('協', '協力', 'ㄒㄧㄝˊ ㄌㄧˋ', '十＋三個力是協', [('十', 0, 1), ('力', 2, 3), ('力', 4, 5), ('力', 6, 7)],
             '右邊是三個「力」，不可寫成「刀」。', 'https://youtu.be/0O2D9ZMe9eY'),
        ],
        'retention': [(1, 'immediate')],
    },
    {
        'n': 2, 'focus': '掌握左右結構比例並熟練遮蔽書寫', 'strokes': '9～10 畫',
        'sentence': '守紀律的隊伍挖到城堡裡的財寶。',
        'chars': [
            ('律', '紀律', 'ㄐㄧˋ ㄌㄩˋ', '雙人＋筆的下半是律', [('彳', 0, 2), ('聿', 3, 8)],
             '右邊「聿」的豎要穿過橫畫。', 'https://youtu.be/AUrBox8xYD4'),
            ('挖', '挖掘', 'ㄨㄚ ㄐㄩㄝˊ', '扌＋穴＋乙是挖', [('扌', 0, 2), ('穴', 3, 7), ('乙', 8, 8)],
             '右上是「穴」，下面是「乙」不是「九」（和「究」比一比）。', 'https://youtu.be/vDN0_jjCcDw'),
            ('城', '城堡', 'ㄔㄥˊ ㄅㄠˇ', '土＋成是城', [('土', 0, 2), ('成', 3, 8)],
             '左窄右寬，左邊「土」的最後一筆是提。', 'https://youtu.be/ptUhGJoSoLA'),
            ('財', '財寶', 'ㄘㄞˊ ㄅㄠˇ', '貝＋才是財', [('貝', 0, 6), ('才', 7, 9)],
             '右邊是「才」，不是「寸」。', 'https://youtu.be/MIWQrKf45kw'),
        ],
        'retention': [(2, 'immediate')],
    },
    {
        'n': 3, 'focus': '掌握上下結構比例並達成五大步驟自動化', 'strokes': '11 畫',
        'sentence': '基地商店出售貨物和車票。',
        'chars': [
            ('基', '基地', 'ㄐㄧ ㄉㄧˋ', '其＋土是基', [('其', 0, 7), ('土', 8, 10)],
             '上面「其」要寫扁，下面「土」不可寫成「士」。', 'https://youtu.be/jMAJOa52oS8'),
            ('售', '出售', 'ㄔㄨ ㄕㄡˋ', '隹＋口是售', [('隹', 0, 7), ('口', 8, 10)],
             '上方「隹」右邊有四橫。', 'https://youtu.be/WQzynRH8L94'),
            ('貨', '貨物', 'ㄏㄨㄛˋ ㄨˋ', '化＋貝是貨', [('化', 0, 3), ('貝', 4, 10)],
             '上面「化」寫扁，下面「貝」對齊中線。', 'https://youtu.be/NETx__7qCGk'),
            ('票', '車票', 'ㄔㄜ ㄆㄧㄠˋ', '西字頭＋示是票', [('覀', 0, 5), ('示', 6, 10)],
             '上方是「覀」，中間兩豎是直的。', 'https://youtu.be/ny08qu9-aE4'),
        ],
        'retention': [(3, 'immediate'), (1, 'week1')],
    },
    {
        'n': 4, 'focus': '理解形聲與會意字原理並強化部件提取', 'strokes': '12～13 畫',
        'sentence': '詩人描寫堅硬的石頭，越寫越心煩。',
        'chars': [
            ('描', '描寫', 'ㄇㄧㄠˊ ㄒㄧㄝˇ', '手＋苗是描', [('扌', 0, 2), ('苗', 3, 11)],
             '右邊「苗」是草字頭加「田」。', 'https://youtu.be/ptzPiqYV5EA'),
            ('硬', '堅硬', 'ㄐㄧㄢ ㄧㄥˋ', '石＋更是硬', [('石', 0, 4), ('更', 5, 11)],
             '左邊「石」要寫窄，右邊「更」最後的撇捺要舒展。', 'https://youtu.be/p6VULsFLFlk'),
            ('詩', '詩人', 'ㄕ ㄖㄣˊ', '言＋寺是詩', [('言', 0, 6), ('寺', 7, 12)],
             '右邊「寺」上面是「土」，不可寫成「士」。', 'https://youtu.be/I2ijQtCVb-U'),
            ('煩', '煩惱', 'ㄈㄢˊ ㄋㄠˇ', '火＋頁是煩', [('火', 0, 3), ('頁', 4, 12)],
             '右邊「頁」下方兩點不可漏。', 'https://youtu.be/LGjvIttFeMQ'),
        ],
        'retention': [(4, 'immediate'), (2, 'week1')],
    },
    {
        'n': 5, 'focus': '運用化整為零拆解多部件字並提升工整度', 'strokes': '14～15 畫',
        'sentence': '國際漢字館蓋在射箭場旁。',
        'chars': [
            ('際', '國際', 'ㄍㄨㄛˊ ㄐㄧˋ', '阝＋祭是際', [('阝', 0, 2), ('祭', 3, 13)],
             '右邊「祭」下方是「示」。', 'https://youtu.be/-6m-nSlyAi0'),
            ('蓋', '蓋子', 'ㄍㄞˋ ㄗ˙', '艸＋去＋皿是蓋', [('艹', 0, 3), ('去', 4, 8), ('皿', 9, 13)],
             '中間是「去」，不是「土」。', 'https://youtu.be/cPd8-a1vo-I'),
            ('漢', '漢字', 'ㄏㄢˋ ㄗˋ', '水＋廿＋口＋夫是漢', [('氵', 0, 2), ('廿', 3, 6), ('口', 7, 9), ('夫', 10, 13)],
             '右下是「夫」。', 'https://youtu.be/W1St65SFFg8'),
            ('箭', '弓箭', 'ㄍㄨㄥ ㄐㄧㄢˋ', '竹＋前是箭', [('竹', 0, 5), ('前', 6, 14)],
             '「前」的下方是「月」和「刂」。', 'https://youtu.be/Tq4VwHkQRpw'),
        ],
        'retention': [(5, 'immediate'), (3, 'week1'), (1, 'week2')],
    },
    {
        'n': 6, 'focus': '攻克高筆畫字並將策略遷移至原班作業', 'strokes': '16～17 畫',
        'sentence': '營隊活動時遺失的手錶，是哥哥打工賺錢買的。',
        'chars': [
            ('錶', '手錶', 'ㄕㄡˇ ㄅㄧㄠˇ', '金＋表是錶', [('金', 0, 7), ('表', 8, 15)],
             '左邊「金」最後一筆是提；右邊「表」下方是「衣」的下半部。', 'https://youtu.be/v4SUQrhVxSI'),
            ('遺', '遺失', 'ㄧˊ ㄕ', '貴＋辶是遺', [('貴', 0, 11), ('辶', 12, 15)],
             '先寫「貴」，再寫「辶」。', 'https://youtu.be/kagOfLmP98k'),
            ('營', '營隊', 'ㄧㄥˊ ㄉㄨㄟˋ', '兩個火＋冖＋呂是營', [('火', 0, 3), ('火', 4, 7), ('冖', 8, 9), ('呂', 10, 16)],
             '下方是「呂」，兩個口之間有一短撇。', 'https://youtu.be/5W2wCDcPJSY'),
            ('賺', '賺錢', 'ㄓㄨㄢˋ ㄑㄧㄢˊ', '貝＋兼是賺', [('貝', 0, 6), ('兼', 7, 16)],
             '右邊「兼」中間兩豎要穿過。', 'https://youtu.be/nK8kXZUaLbI'),
        ],
        'retention': [(6, 'immediate'), (4, 'week1'), (2, 'week2')],
    },
]

# 保留間隔：每週二、四上課，三週上完，所以「一週保留」在兩節之後、「兩週保留」在四節之後。
# 第 6 節之後的保留測驗依實際日期放在追蹤測驗一～三；第 6 節的兩週保留併入 12/17 後測。
FOLLOW_UPS = [
    {'name': '追蹤測驗一', 'date': '12/8（二）', 'folder': '追蹤測驗一_12月8日',
     'retention': [(5, 'week1'), (3, 'week2')]},
    {'name': '追蹤測驗二', 'date': '12/10（四）', 'folder': '追蹤測驗二_12月10日',
     'retention': [(6, 'week1'), (4, 'week2')]},
    {'name': '追蹤測驗三', 'date': '12/15（二）', 'folder': '追蹤測驗三_12月15日',
     'retention': [(5, 'week2')]},
]

# 上課日期（固定週二、週四）。前測在第 1 節之前；後測 12/17（四），同時是第 6 節的兩週保留。
LESSON_DATES = {1: '11/17（二）', 2: '11/19（四）', 3: '11/24（二）', 4: '11/26（四）', 5: '12/1（二）', 6: '12/3（四）'}
PRETEST_DATE = '11/17（二）第 1 節開始前（能更早更好）'
POSTTEST_DATE = '12/17（四）'

# 語詞的意思（上課簡報用，以學生聽得懂的說法）；note 是字在情境句裡的另一種用法。
MEANINGS = {
    '投手': '棒球比賽中，負責把球投給打擊者的球員。',
    '研究': '仔細觀察、思考，想弄清楚事情的道理。',
    '股市': '買賣股票的市場。',
    '協力': '大家一起出力、互相幫忙。',
    '紀律': '大家都要遵守的規矩。',
    '挖掘': '用工具把土挖開，把東西找出來。',
    '城堡': '用高高的城牆圍起來、可以防守的大建築。',
    '財寶': '錢和珍貴的寶物。',
    '基地': '做事情的根據地，大家出發和回來的地方。',
    '出售': '把東西賣出去。',
    '貨物': '可以拿來買賣的東西。',
    '車票': '搭車時要買、要給人看的票。',
    '描寫': '用文字把看到的樣子寫出來。',
    '堅硬': '非常硬，不容易變形或打破。',
    '詩人': '會寫詩、以寫詩出名的人。',
    '煩惱': '心裡覺得煩、不舒服。',
    '國際': '和世界上很多國家有關的。',
    '蓋子': '蓋在瓶子、鍋子上面，可以打開的東西。',
    '漢字': '我們寫的國字，也叫中文字。',
    '弓箭': '弓和箭，用弓把箭射出去。',
    '手錶': '戴在手腕上看時間的小鐘錶。',
    '遺失': '東西不小心弄丟了。',
    '營隊': '一起參加露營或活動的團體。',
    '賺錢': '工作以後得到錢。',
}
NOTES = {'蓋': '「蓋」也可以是「建造」的意思，例如情境句裡的「蓋在射箭場旁」。'}

DELAY_NAME = {'immediate': '立即', 'week1': '一週保留', 'week2': '兩週保留'}


def lesson_entries(lesson):
    entries = []
    for char, word, pinyin, *_ in lesson['chars']:
        idx = lesson['sentence'].index(char)
        sentence = lesson['sentence'][:idx] + '[  ]' + lesson['sentence'][idx + 1:]
        entries.append({'word': word, 'pinyin': pinyin, 'targetIdx': word.index(char), 'sentence': sentence})
    return entries


def build():
    OUT.mkdir(exist_ok=True)
    parts = {}
    by_n = {lesson['n']: lesson for lesson in LESSONS}
    for lesson in LESSONS:
        for char, _w, _p, mnemonic, plist, tips, video in lesson['chars']:
            parts[char] = {
                'parts': [{'label': label, 'strokes': list(range(a, b + 1))} for label, a, b in plist],
                'mnemonic': mnemonic,
                'tips': tips,
                'video': video,
                'word': _w,
                'meaning': MEANINGS[_w],
                'note': NOTES.get(char),
            }
    (OUT / 'parts.json').write_text(json.dumps(parts, ensure_ascii=False, indent=1), encoding='utf-8')

    def practice(n):
        lesson = by_n[n]
        return {'id': f'L{n}', 'bookId': f'第{n}節', 'number': n,
                'title': '、'.join(c[0] for c in lesson['chars']),
                'label': f'第{n}節　' + '、'.join(c[0] for c in lesson['chars']),
                'sentence': lesson['sentence'], 'date': LESSON_DATES[n], 'scene': f'scenes/{n}.jpg',
                'focus': lesson['focus'], 'strokes': lesson['strokes'],
                'entries': lesson_entries(lesson)}

    def test(n, delay):
        item = practice(n)
        item['id'] = f'T{n}-{delay}'
        item['testLabel'] = f'第{n}節生字（{DELAY_NAME[delay]}）'
        item.pop('sentence', None)  # 測驗資料不帶情境句（含目標字）
        item['delay'] = delay
        return item

    for lesson in LESSONS:
        n = lesson['n']
        data = {'practice': [practice(n)], 'retention': [test(m, d) for m, d in lesson['retention']]}
        (OUT / f'lessons-{n}.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    for k, follow in enumerate(FOLLOW_UPS, 1):
        data = {'practice': [practice(lesson['n']) for lesson in LESSONS],
                'retention': [test(m, d) for m, d in follow['retention']]}
        (OUT / f'follow-{k}.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    all_data = {'practice': [practice(lesson['n']) for lesson in LESSONS],
                'retention': [test(m, d) for lesson in LESSONS for m, d in lesson['retention']]
                + [test(m, d) for f in FOLLOW_UPS for m, d in f['retention']]}
    (OUT / 'lessons-all.json').write_text(json.dumps(all_data, ensure_ascii=False, indent=1), encoding='utf-8')
    return LESSONS


if __name__ == '__main__':
    build()
    print('ok')
