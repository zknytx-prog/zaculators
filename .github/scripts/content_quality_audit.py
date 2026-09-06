from pathlib import Path
from html.parser import HTMLParser
from collections import Counter, defaultdict
from urllib.parse import urlparse
import re, json, html as htmlmod

ROOT = Path('.')
TODAY = (2026, 9, 6)

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.tag = None
        self.buf = []
        self.title = ''
        self.headings = []
        self.paragraphs = []
        self.links = []
        self.canonical = ''
        self.meta_description = ''
        self.robots = ''
        self.meta_refresh = False
        self.schemas = []
        self._script_type = ''
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('script','style','noscript','template'):
            self.skip += 1
            if tag == 'script': self._script_type = a.get('type','')
        if self.skip: return
        if tag in ('title','h1','h2','h3','h4','p','li'):
            self.tag = tag; self.buf = []
        if tag == 'a':
            href = a.get('href','').strip()
            if href: self.links.append(href)
        if tag == 'link' and 'canonical' in a.get('rel','').lower():
            self.canonical = a.get('href','').strip()
        if tag == 'meta':
            name = a.get('name','').lower()
            if name == 'description': self.meta_description = a.get('content','').strip()
            if name == 'robots': self.robots = a.get('content','').strip().lower()
            if a.get('http-equiv','').lower() == 'refresh': self.meta_refresh = True
    def handle_endtag(self, tag):
        if tag in ('script','style','noscript','template'):
            if self.skip: self.skip -= 1
            self._script_type = ''
            return
        if self.skip: return
        if tag == self.tag:
            text = re.sub(r'\s+', ' ', ' '.join(self.buf)).strip()
            if tag == 'title': self.title = text
            elif tag in ('h1','h2','h3','h4') and text: self.headings.append((tag,text))
            elif tag in ('p','li') and text: self.paragraphs.append(text)
            self.tag = None; self.buf=[]
    def handle_data(self, data):
        if not self.skip and self.tag: self.buf.append(data)

def strip_visible(html):
    x = re.sub(r'(?is)<(script|style|noscript|template).*?>.*?</\1>', ' ', html)
    x = re.sub(r'(?is)<!--.*?-->', ' ', x)
    x = re.sub(r'(?s)<[^>]+>', ' ', x)
    x = htmlmod.unescape(x)
    return re.sub(r'\s+', ' ', x).strip()

def words(text): return re.findall(r"[A-Za-z0-9%$£€₹'-]+", text)
def norm(s): return re.sub(r'\s+',' ', re.sub(r'[^a-z0-9 ]',' ',s.lower())).strip()

def parse_date(s):
    months={'january':1,'february':2,'march':3,'april':4,'may':5,'june':6,'july':7,'august':8,'september':9,'october':10,'november':11,'december':12}
    m=re.search(r'last updated\s*:\s*([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})',s,re.I)
    if m: return (int(m.group(3)),months.get(m.group(1).lower(),0),int(m.group(2)))
    m=re.search(r'last updated\s*:\s*([A-Za-z]+)\s+(\d{4})',s,re.I)
    if m: return (int(m.group(2)),months.get(m.group(1).lower(),0),1)
    return None

def age_days(d):
    import datetime
    if not d or not d[1]: return None
    return (datetime.date(*TODAY)-datetime.date(*d)).days

html_files=[p for p in ROOT.rglob('*.html') if '.git' not in p.parts]
pages=[]; para_map=defaultdict(set)
residue_terms=['batch 1 financial','zero dependencies','accessible form structure','client-side calculation only','no external libraries','faq + next-step guidance built in','validation and edge-case handling']
regulated_terms=['tax','vat','gst','paye','national-insurance','salary-calculator','pension','cpf','epf','gratuity','end-of-service','gosi','inheritance','zakat','mortgage','apr','loan','bac','bmi','calorie','tdee','body-fat','pregnancy','ovulation','water-intake','protein-intake','vo2','heart-rate']

for p in html_files:
    raw=p.read_text(encoding='utf-8',errors='ignore')
    parser=PageParser()
    try: parser.feed(raw)
    except Exception: pass
    visible=strip_visible(raw)
    wc=len(words(visible))
    headings=[t for _,t in parser.headings]
    hnorm=[norm(x) for x in headings]
    is_redirect=parser.meta_refresh or parser.title.lower().startswith('redirecting') or (wc<120 and 'has moved' in visible.lower())
    ext=[]
    for href in parser.links:
        if href.startswith(('http://','https://')):
            host=urlparse(href).netloc.lower().replace('www.','')
            if host and host not in ('zaculators.com','bizycalc.com'): ext.append(href)
    last=parse_date(visible); age=age_days(last)
    faq_count=sum(1 for _,h in parser.headings if '?' in h)
    file_lower=p.name.lower()
    regulated=any(t in file_lower for t in regulated_terms)
    has_formula=any('formula' in h or 'method' in h for h in hnorm)
    has_example=any('worked example' in h or h=='example' or h.startswith('example ') for h in hnorm)
    has_mistakes=any('common mistake' in h for h in hnorm)
    has_disclaimer=any('disclaimer' in h or 'limitation' in h for h in hnorm) or 'not medical advice' in visible.lower() or 'not financial advice' in visible.lower()
    has_refs=any('official reference' in h or 'source' in h or 'references' in h for h in hnorm) or bool(ext)
    residues=[t for t in residue_terms if t in visible.lower()]
    h2s=[t for tag,t in parser.headings if tag=='h2']
    dup_h2=sorted([h for h,c in Counter(h2s).items() if c>1])
    para_norm=[]
    for q in parser.paragraphs:
        if len(words(q))>=12:
            nq=norm(q)
            if nq:
                para_norm.append(nq); para_map[nq].add(str(p))
    pages.append({
        'path':str(p),'bytes':len(raw.encode('utf-8')),'word_count':wc,'title':parser.title,
        'redirect':is_redirect,'canonical':parser.canonical,'robots':parser.robots,'meta_description_len':len(parser.meta_description),
        'faq_questions':faq_count,'h1_count':sum(1 for t,_ in parser.headings if t=='h1'),'h2_count':len(h2s),
        'has_formula_or_method':has_formula,'has_worked_example':has_example,'has_common_mistakes':has_mistakes,
        'has_disclaimer_or_limitations':has_disclaimer,'has_references_or_external_sources':has_refs,'external_source_links':ext[:8],
        'regulated_or_ymyl':regulated,'last_updated':last,'last_updated_age_days':age,'template_residue':residues,'duplicate_h2':dup_h2,
        '_paras':para_norm,
    })

repeated={k:v for k,v in para_map.items() if len(v)>=10}
for x in pages:
    pars=x.pop('_paras')
    x['repeated_paragraphs_10plus']=sum(1 for q in pars if q in repeated)
    x['paragraphs_12plus_words']=len(pars)
    x['repeated_paragraph_ratio']=round((x['repeated_paragraphs_10plus']/len(pars)),3) if pars else 0
    issues=[]
    if x['redirect']: issues.append('redirect_alias')
    else:
        if x['word_count']<250: issues.append('very_thin_under_250_words')
        elif x['word_count']<400: issues.append('thin_under_400_words')
        if x['h1_count']!=1: issues.append('h1_count_not_1')
        if x['faq_questions']<5 and x['path'] not in ('index.html','all-calculators.html'): issues.append('fewer_than_5_FAQ_questions')
        if not x['has_formula_or_method'] and x['path'] not in ('index.html','all-calculators.html','about-us.html','contact-us.html','privacy-policy.html','terms-of-service.html','disclaimer.html'): issues.append('no_formula_or_method_section')
        if not x['has_worked_example'] and x['path'] not in ('index.html','all-calculators.html','about-us.html','contact-us.html','privacy-policy.html','terms-of-service.html','disclaimer.html'): issues.append('no_worked_example')
        if x['regulated_or_ymyl'] and not x['has_references_or_external_sources']: issues.append('ymyl_or_regulated_no_external_source')
        if x['regulated_or_ymyl'] and x['last_updated_age_days'] is not None and x['last_updated_age_days']>120: issues.append('ymyl_last_updated_over_120_days')
        if x['regulated_or_ymyl'] and x['last_updated'] is None: issues.append('ymyl_no_last_updated_date')
        if x['template_residue']: issues.append('developer_template_residue')
        if x['duplicate_h2']: issues.append('duplicate_h2_on_page')
        if x['repeated_paragraph_ratio']>=0.5 and x['paragraphs_12plus_words']>=4: issues.append('high_repeated_paragraph_ratio')
    x['issues']=issues

indexable=[x for x in pages if not x['redirect']]
issue_counts=Counter(i for x in indexable for i in x['issues'])
severity=lambda x: (3*('very_thin_under_250_words' in x['issues'])+2*('thin_under_400_words' in x['issues'])+3*('ymyl_or_regulated_no_external_source' in x['issues'])+2*('developer_template_residue' in x['issues'])+2*('high_repeated_paragraph_ratio' in x['issues'])+1*('no_worked_example' in x['issues'])+1*('no_formula_or_method_section' in x['issues'])+1*('fewer_than_5_FAQ_questions' in x['issues'])+1*('duplicate_h2_on_page' in x['issues']))
ranked=sorted(indexable,key=lambda x:(severity(x),-x['word_count']),reverse=True)

repeated_top=[]
for para,files in sorted(repeated.items(), key=lambda kv:(len(kv[1]),len(kv[0])), reverse=True)[:30]:
    repeated_top.append({'count':len(files),'paragraph':para[:320],'sample_pages':sorted(files)[:12]})

out={
 'summary':{
  'html_files':len(pages),'indexable_non_redirect_pages':len(indexable),'redirect_alias_pages':sum(x['redirect'] for x in pages),
  'under_250_words':sum((not x['redirect']) and x['word_count']<250 for x in pages),
  'under_400_words':sum((not x['redirect']) and x['word_count']<400 for x in pages),
  'median_word_count':sorted(x['word_count'] for x in indexable)[len(indexable)//2] if indexable else 0,
  'issue_counts':dict(issue_counts),
 },
 'highest_priority_pages':[{k:v for k,v in x.items() if k not in ('external_source_links',)} | {'severity_score':severity(x)} for x in ranked[:80]],
 'all_pages':pages,
 'top_repeated_paragraphs':repeated_top,
}
Path('content-quality-audit.json').write_text(json.dumps(out,indent=2),encoding='utf-8')

lines=['# Zaculators Content Quality Audit','',f"HTML files: **{out['summary']['html_files']}**",f"Indexable/non-redirect pages: **{out['summary']['indexable_non_redirect_pages']}**",f"Redirect aliases: **{out['summary']['redirect_alias_pages']}**",f"Median visible word count: **{out['summary']['median_word_count']}**",f"Pages under 250 words: **{out['summary']['under_250_words']}**",f"Pages under 400 words: **{out['summary']['under_400_words']}**",'', '## Issue counts','']
for k,v in issue_counts.most_common(): lines.append(f'- {k}: **{v}**')
lines += ['', '## Highest-priority pages','', '| Page | Words | Score | Issues |','|---|---:|---:|---|']
for x in ranked[:50]: lines.append(f"| `{x['path']}` | {x['word_count']} | {severity(x)} | {', '.join(x['issues'])} |")
lines += ['', '## Most repeated paragraphs','']
for r in repeated_top[:15]: lines.append(f"- **{r['count']} pages** — {r['paragraph'][:180]}")
Path('CONTENT-QUALITY-AUDIT.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps(out['summary'],indent=2))
