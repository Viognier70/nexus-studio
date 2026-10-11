"""Läser SITUATIONER_306c_OMG1.md och OMG2-4.md till en JSON per situation (svenskan)."""
import json, re, sys

files = sys.argv[1:3]
out_path = sys.argv[3]

text = '\n'.join(open(f, encoding='utf-8').read() for f in files)
blocks = re.split(r'\n### ', text)[1:]

def strip_period(s):
    return s[:-1] if s.endswith('.') else s

def italics(s):
    return re.findall(r'\*([^*]+)\*', s)

Q = {'rätt': 'best', 'ok': 'ok', 'fel': 'wrong'}
G = {'H': 'full', 'A': 'analysis', 'U': 'experience', 'F': 'wrong'}

res = {}
for b in blocks:
    head, *lines = b.split('\n')
    m = re.match(r'(vb\d+) · (.+?)( ⚖)?( \(.*\))?$', head.strip())
    assert m, head
    vid, title, legal = m.group(1), m.group(2), bool(m.group(3))
    body = '\n'.join(lines)
    d = {'id': vid, 'title': title, 'legal': legal}
    mm = re.search(r'\*\*Ändrad situationstext:\*\* (.+)', body)
    if mm: d['body'] = mm.group(1).strip()
    # Steg 1
    mm = re.search(r'\*\*Ledtråd:\*\* (Analys: .+)', body)
    d['clue1'] = mm.group(1).strip()
    s1 = re.search(r'\*\*Steg 1[^*]*\*\* \(nya förklaringar\):\n((?:- .+\n)+)', body)
    if s1:
        d['s1'] = {}
        for l in s1.group(1).strip().split('\n'):
            x = re.match(r'- ([a-d])\. (.+?) \*\*\((rätt|ok|fel)\)\*\* \*(.+)\*$', l)
            assert x, l
            d['s1'][x.group(1)] = {'label': strip_period(x.group(2)), 'quality': Q[x.group(3)], 'explanation': x.group(4)}
        mm = re.search(r'\*Vid fel:\* (.+?) \*\*Ledtråd:\*\* Analys', body)
        d['fail1'] = mm.group(1).strip()
    # Steg 2
    s2 = re.search(r'\*\*Steg 2[^\n]*\n(.*?)\n\*\*Steg 3', body, re.S)
    s2t = s2.group(1)
    la = re.search(r'- \*A[^*]*:\* (.+)', s2t).group(1).strip()
    lb = re.search(r'- \*B[^*]*:\* (.+)', s2t).group(1).strip()
    q2 = re.search(r'\n\n([^\n-][^\n]*\?)\n', s2t).group(1).strip()
    opts2 = []
    for x in re.finditer(r'\n(\d)\. (.+?) \*\*\((rätt|ok|fel)\)\*\* \*(.+)\*', s2t):
        opts2.append({'label': strip_period(x.group(2)), 'quality': Q[x.group(3)], 'explanation': x.group(4)})
    assert len(opts2) == 3, (vid, opts2)
    clue2 = re.search(r'\*\*Ledtråd:\*\* (Upplevelse: .+)', s2t).group(1).strip()
    d['s2'] = {'lineA': la, 'lineB': lb, 'question': q2, 'options': opts2, 'clue': clue2}
    mm = re.search(r'\*Vid fel:\* (.+?) \*\*Ledtråd:\*\* Upplevelse', s2t)
    if mm: d['fail2'] = mm.group(1).strip()
    # Steg 3
    s3 = body[body.index('**Steg 3'):]
    def opts3(chunk):
        out = []
        for x in re.finditer(r'\n(\d)\. \*\*\[([HAUF])\]\*\* (.+)', chunk):
            rest = x.group(3)
            # Etiketten är texten fram till första *…*; kostnaden och förklaringen är kursiverade.
            label = re.split(r' \*', rest, 1)[0].strip()
            it = italics(rest[len(label):])
            cost = None
            if it and it[0].startswith('Kostnad:'):
                cost = it[0][len('Kostnad: '):].rstrip('.')
                it = it[1:]
            chain = None
            c = re.search(r' \(Leder till `([^`]+)`\.\)', label)
            if c:
                chain = c.group(1)
                label = label.replace(c.group(0), '')
            o = {'grip': G[x.group(2)], 'label': label, 'explanation': it[-1]}
            if cost: o['cost'] = cost
            if chain: o['chain'] = chain
            out.append(o)
        return out
    if vid == 'vb31':
        rows = re.findall(r'\| (\d)\. (.+?) \| \*\*\[([HAUF])\]\*\* \| \*\*\[([HAUF])\]\*\* \|', s3)
        expl = re.findall(r'\n(\d)\. \*(.+)\*', s3)
        d['s3'] = {'options': [{'label': r[1], 'gripA': G[r[2]], 'gripB': G[r[3]], 'explanation': e[1]} for r, e in zip(rows, expl)]}
    elif vid == 'vb35':
        d['s3'] = {}
        for x in re.finditer(r'\*\*Steg 3, variant ([a-d])\.\*\* (.+?)\n((?:\d\. .+\n)+)', s3):
            d['s3'][x.group(1)] = {'question': x.group(2).strip(), 'options': opts3('\n' + x.group(3))}
    else:
        d['s3'] = {'options': opts3(s3)}
    def bullet(name):
        mm = re.search(r'- \*' + re.escape(name) + r'[^*]*:\* (.+)', s3)
        return mm.group(1).strip() if mm else None
    for key, name in [('halfAnalysis', 'Halvt grepp mot analysen'), ('halfExperience', 'Halvt grepp mot upplevelsen')]:
        v = bullet(name)
        if v:
            a, room = v.split(' *I rummet:* ')
            d[key] = {'text': a.strip(), 'room': room.strip()}
    d['success'] = bullet('Klarad')
    d['staffSuccess'] = bullet('Personalen lyckas')
    d['staffFail'] = bullet('Personalen misslyckas')
    res[vid] = d

json.dump(res, open(out_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(res), sorted(res))
