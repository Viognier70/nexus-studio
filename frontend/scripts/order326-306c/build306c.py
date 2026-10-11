"""ORDER 326 A — vinbarens 29 äldre situationer i formen analys → upplevelse → handling (306c).

Kördes en gång mot den gamla formen (main 9020fa65):
  python3 -I parse306c.py documentation/blueprints/SITUATIONER_306c_OMG1.md documentation/blueprints/SITUATIONER_306c_OMG2-4.md sv306c.json
  python3 build306c.py frontend/src/content/incidents sv306c.json en306c.json
Skriver om vinbar.meta.json, vinbar.text.sv.draft.json och vinbar.text.en.json i katalogen. Svenskan ur filerna,
engelskan ur en306c.json, längdändringarna ur edits306c.py (ORDER_326_RAPPORT.md).
"""
import copy, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from edits306c import EDITS

D, SV, EN = sys.argv[1:4]
meta = json.load(open(f'{D}/vinbar.meta.json', encoding='utf-8'))
tsv = json.load(open(f'{D}/vinbar.text.sv.draft.json', encoding='utf-8'))
ten = json.load(open(f'{D}/vinbar.text.en.json', encoding='utf-8'))
sv = json.load(open(SV, encoding='utf-8'))
en = json.load(open(EN, encoding='utf-8'))

FULL = {i['id'].split('-')[0]: i['id'] for i in meta['incidents'] if not i['id'].startswith('vb35')}
INC = {i['id']: i for i in meta['incidents']}

# Kostnaderna i kronor (förslag, som i 306b A7: husvinets inköp 24 kr glaset, fem glas i flaskan;
# brödet tre portioner mjöl à 2 kr; kaffet balance.ts compCoffeeCostSek 25 kr koppen).
GLASS, BOTTLE = 24, 120
COST = {'två glas': 2 * GLASS, 'en tallrik bröd': 6, 'ett glas': GLASS, 'bröd till borden': 36,
        'kaffe till bordet': 2 * 25, 'hela notan': 2 * 32 + BOTTLE, 'flaskan': BOTTLE}

# Lägen som utgår: steg 3 har ett helt grepp oavsett läge (306c). vb05 och vb08 kommer bara i det läge
# texten förutsätter (tidigt, ett fullt rum).
DROP_SITUATIONS = {'vb05': {'to': '21:00'}, 'vb08': {'minSeated': 9}, 'vb13': None, 'vb19': None}

# Följdtexterna där de gamla var platshållare ("Jag tar hand om det.", "Risk för erinran").
PLACEHOLDER_FAIL3 = {
    'vb33': ('Skärvorna ligger kvar i entrén, och gästen tror att felet var hens.', 'The shards are still in the entrance, and the guest thinks the mistake was theirs.'),
    'vb34': ('Glasen går vidare till honom, och han blir högre vid baren.', 'The glasses are passed on to him, and he gets louder at the bar.'),
    'vb36': ('Gästen står kvar vid passet medan köket arbetar runt henne.', 'The guest stays at the pass while the kitchen works around her.'),
    'vb35': ('Tillsynen skriver en anmärkning i rapporten.', 'The inspectors write a remark in the report.'),
}
PLACEHOLDER_ONGOING2 = {
    'vb33': ('Gästen i rullstolen sitter tyst vid sitt bord.', 'The guest in the wheelchair sits in silence at their table.'),
    'vb34': ('Vännerna vid baren beställer åt honom.', 'The friends at the bar order for him.'),
    'vb36': ('Gästen tittar mot passet gång på gång.', 'The guest keeps looking towards the pass.'),
    'vb35': ('Tillsynen antecknar medan Per städar i baren.', 'The inspectors take notes while Per tidies the bar.'),
}
STEP3_Q = ('Vad gör du?', 'What do you do?')
QUALITY = {'full': ('best', None), 'analysis': ('ok', 'analysis'), 'experience': ('ok', 'experience'), 'wrong': ('wrong', None)}


def curly(s):
    out, open_ = [], True
    for ch in s:
        if ch == '"':
            out.append('“' if open_ else '”')
            open_ = not open_
        else:
            out.append(ch)
    return ''.join(out)


def step2_fail(old):
    """Phronesis-stegets gamla följd: bara stämningen och ryktet (306c: "Steg 2 påverkar bara stämningen och
    ryktet"). Kassan och orken är redan 0 sedan 306b.4; den pågående följden behåller stämningen per minut,
    orken och tempot tas bort. Gästerna som går (room) och kedjorna flyttas till steg 3."""
    f = copy.deepcopy(old)
    f['effects']['cash'] = max(0, f['effects']['cash'])
    f['effects']['stamina'] = 0
    moved = {k: f.pop(k) for k in ('room', 'triggers') if k in f}
    og = f.get('ongoing')
    if og:
        og['staminaPerMinute'] = 0
        og['tempoFactor'] = 1
        if og['satisfactionPerMinute'] == 0:
            del f['ongoing']
    return f, moved


def step3_fail(old_techne, moved):
    f = copy.deepcopy(old_techne)
    if 'room' in moved:
        room = dict(f.get('room', {}))
        for k, v in moved['room'].items():
            room[k] = max(room.get(k, 0), v)
        f['room'] = room
    if 'triggers' in moved:
        f['triggers'] = sorted(set(f.get('triggers', [])) | set(moved['triggers']))
    return f


def convert(short, inc_id, d_sv, d_en, variant=None):
    m = INC[inc_id]
    old_steps = m['steps']
    ax = [s['axis'] for s in old_steps]
    assert ax == ['episteme', 'techne', 'phronesis'], (inc_id, ax)
    s1, techne, phron = old_steps
    tsv_old, ten_old = tsv['texts'][inc_id], ten['texts'][inc_id]
    nm = {k: v for k, v in m.items() if k not in ('steps', 'situations', 'when')}
    nm['form'] = 'triad'
    if short == 'vb31': nm['lineBySituation'] = {'middag': 'a', 'efter-middag': 'b'}
    if short in DROP_SITUATIONS:
        when = DROP_SITUATIONS[short]
        if when: nm['when'] = when
        elif 'when' in m: nm['when'] = m['when']
    else:
        if 'when' in m: nm['when'] = m['when']
        if 'situations' in m: nm['situations'] = m['situations']
    # Steg 1: som förut. vb33–vb36: kvaliteten ska stämma med filen.
    n1 = copy.deepcopy(s1)
    if 's1' in d_sv:
        for o in n1['options']:
            assert d_sv['s1'][o['id']]['quality'] == o['quality'], (inc_id, o)
    # Steg 2.
    f2, moved = step2_fail(phron['fail'])
    n2 = {'axis': 'phronesis', 'options': [{'id': 'abc'[i], 'quality': o['quality']} for i, o in enumerate(d_sv['s2']['options'])], 'fail': f2}
    # Steg 3.
    src3 = d_sv['s3'][variant] if variant else d_sv['s3']
    src3en = d_en['s3'][variant]['options'] if variant else d_en['s3']
    opts3 = []
    for i, o in enumerate(src3['options']):
        oid = 'abcd'[i]
        if short == 'vb31':
            # gripByVariant: grundläget är efter middagen (B), middag (A) i `in`.
            q, g = QUALITY[o['gripB']]
            qa, ga = QUALITY[o['gripA']]
            mo = {'id': oid, 'quality': q}
            if g: mo['grip'] = g
            inn = {'quality': qa}
            if ga: inn['grip'] = ga
            if (qa, ga) != (q, g): mo['in'] = {'middag': inn}
        else:
            q, g = QUALITY[o['grip']]
            mo = {'id': oid, 'quality': q}
            if g: mo['grip'] = g
        if o.get('cost'): mo['cost'] = COST[o['cost']]
        opts3.append(mo)
    f3 = step3_fail(techne['fail'], moved)
    n3 = {'axis': 'techne', 'options': opts3, 'fail': f3}
    # Kedjorna på svaret som anges (306c: "Leder till").
    chain_fail_text = {}
    for i, o in enumerate(src3['options']):
        ch = o.get('chain')
        if not ch: continue
        mo = opts3[i]
        if mo['quality'] == 'ok':
            mo['triggers'] = [ch]  # halvt grepp som ändå leder vidare (incidents.ts)
        else:
            # Felsvarets egen följd: den gamla följden som ledde till samma kedja.
            src = {'vb10': (s1['fail'], tsv_old['steps'][0]['fail'], ten_old['steps'][0]['fail']),
                   'vb14': (s1['options'][0]['fail'], tsv_old['steps'][0]['options']['a']['fail'], ten_old['steps'][0]['options']['a']['fail'])}[short]
            assert ch in src[0]['triggers'], (inc_id, ch)
            mo['fail'] = copy.deepcopy(src[0])
            chain_fail_text[mo['id']] = (src[1], src[2])
    legal = d_sv['legal']
    if legal:
        nm['legal'] = {'legalReviewed': False}
        for st in (n1, n2, n3): st['legal'] = True
    nm['steps'] = [n1, n2, n3]

    def text(lang):
        d = d_sv if lang == 'sv' else d_en
        old = tsv_old if lang == 'sv' else ten_old
        L = 0 if lang == 'sv' else 1
        t = {'title': old['title'], 'body': d.get('body', old['body'])}
        if 'situations' in nm: t['situations'] = old['situations']
        t['guestLine'] = {'a': curly(d['s2']['lineA']), 'b': curly(d['s2']['lineB'])}
        st1 = copy.deepcopy(old['steps'][0])
        for o in st1['options'].values(): o.pop('explanationIn', None)
        if 's1' in d:
            for k, o in d['s1'].items(): st1['options'][k]['explanation'] = o['explanation']
            st1['fail'] = {'outcome': d['fail1']}
        st1['clue'] = d['clue1']
        # Steg 2: den gamla phronesis-följdens text, eller filens "Vid fel".
        f2t = {'outcome': d.get('fail2', old['steps'][2]['fail']['outcome'])}
        if 'ongoing' in f2:
            f2t['ongoing'] = PLACEHOLDER_ONGOING2[short][L] if short in PLACEHOLDER_ONGOING2 else old['steps'][2]['fail']['ongoing']
        st2 = {'question': d['s2']['question'], 'options': {'abc'[i]: {'label': o['label'], 'explanation': o['explanation']} for i, o in enumerate(d['s2']['options'])},
               'fail': f2t, 'clue': d['s2']['clue']}
        # Steg 3: den gamla techne-följdens text.
        s3src = (d['s3'][variant] if variant else d['s3'])
        s3opts = s3src['options'] if isinstance(s3src, dict) else s3src
        q3 = s3src['question'] if isinstance(s3src, dict) and 'question' in s3src else STEP3_Q[L]
        if short in PLACEHOLDER_FAIL3:
            f3t = {'outcome': PLACEHOLDER_FAIL3[short][L]}
        else:
            f3t = {'outcome': old['steps'][1]['fail']['outcome']}
            if 'ongoing' in f3:
                f3t['ongoing'] = old['steps'][1]['fail'].get('ongoing') or old['steps'][2]['fail']['ongoing']
        st3 = {'question': q3, 'options': {}, 'fail': f3t}
        for i, o in enumerate(s3opts):
            oid = 'abcd'[i]
            st3['options'][oid] = {'label': o['label'], 'explanation': o['explanation']}
            if oid in chain_fail_text: st3['options'][oid]['fail'] = copy.deepcopy(chain_fail_text[oid][L])
        for (es, en_step, ev, ei), pair in EDITS.items():
            if es != short or (ev is not None and ev != variant): continue
            new = pair[L]
            if new is None: continue
            (st2 if en_step == 2 else st3)['options']['abcd'[ei]]['label'] = new
        t['steps'] = [st1, st2, st3]
        if 'halfAnalysis' in d:
            t['halfGrip'] = {'analysis': d['halfAnalysis']['text'], 'experience': d['halfExperience']['text'],
                             'outcomeAnalysis': d['halfAnalysis']['room'], 'outcomeExperience': d['halfExperience']['room']}
        succ = d['success']
        if variant:
            if isinstance(succ, str):
                parts = dict(re.findall(r'([a-d]): "([^"]+)"', succ))
                succ = parts[variant]
            else:
                succ = succ[variant]
        t['success'] = {'outcome': succ}
        staff = {'outcome': d['staffFail']}
        if 'ongoing' in m['staff']: staff['ongoing'] = old['staff']['ongoing']
        t['staff'] = staff
        t['staffTexts'] = {'success': d['staffSuccess'], 'fail': d['staffFail']}
        return t

    tsv_new, ten_new = text('sv'), text('en')
    # Svarens ordning i data: filernas ordning har det rätta svaret först. En fast rotation per situation och steg
    # (kortet blandar dessutom vid varje visning, incidents.ts optionOrder).
    for k in (1, 2):
        opts = nm['steps'][k]['options']
        n = len(opts)
        r = sum(map(ord, f'{inc_id}|{k}')) % n
        order = [opts[(i + r) % n] for i in range(n)]
        ids = 'abcd'[:n]
        remap = {o['id']: ids[i] for i, o in enumerate(order)}
        for o in order: o['id'] = remap[o['id']]
        nm['steps'][k]['options'] = order
        for t in (tsv_new, ten_new):
            old = t['steps'][k]['options']
            t['steps'][k]['options'] = {remap[x]: old[x] for x in sorted(old, key=lambda x: remap[x])}
    return nm, tsv_new, ten_new


new_meta, new_sv, new_en = {}, {}, {}
for short, d_sv in sv.items():
    d_en = en[short]
    targets = [(f'vb35-tillsynen-{v}', v) for v in 'abcd'] if short == 'vb35' else [(FULL[short], None)]
    for inc_id, variant in targets:
        nm, a, b = convert(short, inc_id, d_sv, d_en, variant)
        new_meta[inc_id], new_sv[inc_id], new_en[inc_id] = nm, a, b

assert len(new_meta) == 29, len(new_meta)
meta['incidents'] = [new_meta.get(i['id'], i) for i in meta['incidents']]
for tf, nt in ((tsv, new_sv), (ten, new_en)):
    for k, v in nt.items(): tf['texts'][k] = v
for name, obj in (('vinbar.meta.json', meta), ('vinbar.text.sv.draft.json', tsv), ('vinbar.text.en.json', ten)):
    open(f'{D}/{name}', 'w', encoding='utf-8').write(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')
print('ok', len(new_meta))
