import re, json, hashlib, itertools, statistics, time
from collections import Counter, defaultdict
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

BASE='https://zaculators.com/'
GB='Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
BROWSER='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36'
TIMEOUT=20

def get(url, ua=GB):
    try:
        r=requests.get(url,headers={'User-Agent':ua,'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'},timeout=TIMEOUT,allow_redirects=True)
        return r
    except Exception as e:
        return e

def clean_text(soup):
    s=BeautifulSoup(str(soup),'html.parser')
    for t in s(['script','style','noscript','svg','template']): t.decompose()
    txt=' '.join(s.stripped_strings)
    return re.sub(r'\s+',' ',txt).strip()

def parse_date(text):
    m=re.search(r'Last updated\s*:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})',text,re.I)
    return m.group(1) if m else None

def path(u):
    p=urlparse(u).path or '/'
    return p

# seed from sitemap + homepage links + known policy/AI pages
smap=get(urljoin(BASE,'sitemap.xml'))
urls=set([BASE])
if hasattr(smap,'text'):
    urls.update(re.findall(r'<loc>(.*?)</loc>',smap.text,re.I))
for extra in ['about-us.html','contact-us.html','privacy-policy.html','terms-of-service.html','disclaimer.html','all-calculators.html','ai-tools/','ads.txt','robots.txt']:
    urls.add(urljoin(BASE,extra))

home=get(BASE)
if hasattr(home,'text'):
    hs=BeautifulSoup(home.text,'html.parser')
    for a in hs.find_all('a',href=True):
        u=urljoin(BASE,a['href'])
        if urlparse(u).netloc.endswith('zaculators.com'):
            urls.add(u.split('#')[0])

rows=[]; para_pages=defaultdict(set); visible_texts={}
for i,u in enumerate(sorted(urls)):
    if u.endswith(('.xml','.txt')):
        r=get(u)
        rows.append({'url':u,'path':path(u),'status':getattr(r,'status_code',None),'final':getattr(r,'url',None),'type':'text-resource','server':getattr(r,'headers',{}).get('server') if hasattr(r,'headers') else None,'body':getattr(r,'text','')[:2000]})
        continue
    rg=get(u,GB); rb=get(u,BROWSER)
    if not hasattr(rg,'status_code'):
        rows.append({'url':u,'path':path(u),'error':str(rg)}); continue
    soup=BeautifulSoup(rg.text,'html.parser'); txt=clean_text(soup); visible_texts[u]=txt.lower()
    title=soup.title.get_text(' ',strip=True) if soup.title else ''
    desc=''; md=soup.find('meta',attrs={'name':re.compile('description',re.I)})
    if md: desc=md.get('content','')
    canonical=''; c=soup.find('link',rel=lambda x:x and 'canonical' in [y.lower() for y in (x if isinstance(x,list) else [x])])
    if c: canonical=urljoin(u,c.get('href',''))
    robots=' '.join(x.get('content','') for x in soup.find_all('meta',attrs={'name':re.compile('robots',re.I)}))
    h1=[x.get_text(' ',strip=True) for x in soup.find_all('h1')]
    h2=[x.get_text(' ',strip=True) for x in soup.find_all('h2')]
    links=[]
    for a in soup.find_all('a',href=True):
        href=a.get('href',''); full=urljoin(u,href); links.append((href,full,a.get_text(' ',strip=True),a.get('rel',[])))
    internal=[x for x in links if urlparse(x[1]).netloc.endswith('zaculators.com')]
    external=[x for x in links if urlparse(x[1]).scheme in ('http','https') and not urlparse(x[1]).netloc.endswith('zaculators.com')]
    policy_targets={'about-us.html','contact-us.html','privacy-policy.html','terms-of-service.html','disclaimer.html'}
    policy_hits={k:any(urlparse(x[1]).path.endswith(k) for x in internal) for k in policy_targets}
    paras=[]
    for p in soup.find_all(['p','li']):
        t=' '.join(p.stripped_strings); t=re.sub(r'\s+',' ',t).strip()
        if len(t)>=70:
            norm=re.sub(r'[^a-z0-9 ]','',t.lower())
            norm=re.sub(r'\s+',' ',norm).strip()
            if len(norm)>=60:
                paras.append(norm); para_pages[norm].add(u)
    ad_script='pagead2.googlesyndication.com/pagead/js/adsbygoogle.js' in rg.text
    ad_units=len(soup.select('ins.adsbygoogle'))
    affiliate=('affiliate' in txt.lower()) or ('affiliate' in rg.text.lower())
    placeholder_links=sum(1 for h,full,_,_ in links if h.strip() in ('#','javascript:void(0)','javascript:void(0);'))
    paid_listing=bool(re.search(r'featured listings?|\$\d+\s*/\s*mo|list your tool',txt,re.I))
    footer=soup.find('footer'); footer_text=footer.get_text(' ',strip=True) if footer else ''
    nav=soup.find('nav'); nav_text=nav.get_text(' ',strip=True) if nav else ''
    after_html=bool(re.search(r'</html>\s*\S+',rg.text,re.I|re.S))
    mobile_apps='mobile applications' in txt.lower()
    dev_terms=[t for t in ['batch 1','zero dependencies','client-side calculation','no external libraries','template','starter seed set','replace/expand via research pass','todo','lorem ipsum'] if t in rg.text.lower() or t in txt.lower()]
    country_flat=bool(re.search(r'(salary|tax|paye|vat|gst|gratuity|national insurance)',title,re.I) and re.search(r'Estimated (Tax|Federal Tax|Provincial Tax|Other Deduction|VAT) Rate',txt,re.I))
    same_hash=False
    if hasattr(rb,'text'):
        same_hash=hashlib.sha256(rg.text.encode()).hexdigest()==hashlib.sha256(rb.text.encode()).hexdigest()
    rows.append({
      'url':u,'path':path(u),'status':rg.status_code,'final':rg.url,'server':rg.headers.get('server'),'browser_status':getattr(rb,'status_code',None),'googlebot_browser_same_html':same_hash,
      'title':title,'description':desc,'canonical':canonical,'robots':robots,'words':len(re.findall(r"\b[\w'-]+\b",txt)),'h1_count':len(h1),'h1':h1[:3],'h2_count':len(h2),'duplicate_h2':sorted([k for k,v in Counter(h2).items() if v>1]),
      'internal_links':len(internal),'external_links':len(external),'policy_links':policy_hits,'has_home_link':any(urlparse(x[1]).path in ('','/') for x in internal),'has_directory_link':any(urlparse(x[1]).path.endswith('/all-calculators.html') for x in internal),
      'has_nav':bool(nav),'nav_text':nav_text[:300],'has_footer':bool(footer),'footer_text':footer_text[:500],
      'adsense_script':ad_script,'ad_units':ad_units,'affiliate_markers':affiliate,'placeholder_links':placeholder_links,'paid_listing_markers':paid_listing,'mobile_app_claim':mobile_apps,'developer_residue':dev_terms,'country_flat_percent_logic_signal':country_flat,
      'last_updated':parse_date(txt),'coming_soon':bool(re.search(r'coming soon|under construction',txt,re.I)),'after_html_content':after_html,
      'paragraphs':paras[:200]
    })
    time.sleep(0.03)

# repeated paragraphs sitewide
repeated=sorted(((len(v),p,sorted(path(x) for x in v)) for p,v in para_pages.items() if len(v)>=5), reverse=True)

# near-duplicate pairs using sets of 4-word shingles on visible text; only HTML pages over 300 words
shingles={}
for u,txt in visible_texts.items():
    w=re.findall(r'[a-z0-9]+',txt)
    if len(w)<300: continue
    shingles[u]=set(tuple(w[i:i+4]) for i in range(len(w)-3))
pairs=[]
keys=list(shingles)
for a,b in itertools.combinations(keys,2):
    A,B=shingles[a],shingles[b]
    inter=len(A&B); union=len(A|B)
    if not union: continue
    j=inter/union
    if j>=0.72:
        pairs.append((round(j,3),path(a),path(b)))
pairs.sort(reverse=True)

htmlrows=[r for r in rows if r.get('title')]
summary={
 'crawled_urls':len(rows),'html_pages':len(htmlrows),'status_non_200':sum(1 for r in htmlrows if r.get('status')!=200),
 'googlebot_browser_html_differences':sum(1 for r in htmlrows if not r.get('googlebot_browser_same_html')),
 'under_300_words':sum(1 for r in htmlrows if r.get('words',0)<300),
 'under_500_words':sum(1 for r in htmlrows if r.get('words',0)<500),
 'missing_or_multi_h1':sum(1 for r in htmlrows if r.get('h1_count')!=1),
 'duplicate_h2_pages':sum(1 for r in htmlrows if r.get('duplicate_h2')),
 'no_nav_element':sum(1 for r in htmlrows if not r.get('has_nav')),
 'no_home_link':sum(1 for r in htmlrows if not r.get('has_home_link')),
 'no_directory_link':sum(1 for r in htmlrows if not r.get('has_directory_link')),
 'missing_privacy_link':sum(1 for r in htmlrows if not r['policy_links'].get('privacy-policy.html')),
 'missing_terms_link':sum(1 for r in htmlrows if not r['policy_links'].get('terms-of-service.html')),
 'missing_disclaimer_link':sum(1 for r in htmlrows if not r['policy_links'].get('disclaimer.html')),
 'pages_with_adsense_script':sum(1 for r in htmlrows if r.get('adsense_script')),
 'pages_with_ad_units':sum(1 for r in htmlrows if r.get('ad_units',0)>0),
 'policy_pages_with_adsense_script':[r['path'] for r in htmlrows if r['path'] in ['/privacy-policy.html','/terms-of-service.html','/disclaimer.html','/contact-us.html'] and r.get('adsense_script')],
 'affiliate_pages':[r['path'] for r in htmlrows if r.get('affiliate_markers')],
 'paid_listing_pages':[r['path'] for r in htmlrows if r.get('paid_listing_markers')],
 'pages_with_placeholder_links':[r['path'] for r in htmlrows if r.get('placeholder_links',0)>0],
 'country_flat_percent_pages':[r['path'] for r in htmlrows if r.get('country_flat_percent_logic_signal')],
 'developer_residue_pages':[(r['path'],r['developer_residue']) for r in htmlrows if r.get('developer_residue')],
 'mobile_app_claim_pages':[r['path'] for r in htmlrows if r.get('mobile_app_claim')],
 'coming_soon_pages':[r['path'] for r in htmlrows if r.get('coming_soon')],
 'near_duplicate_pairs_072_plus':len(pairs),
}

# prioritized suspicious pages
sus=[]
for r in htmlrows:
    score=0; reasons=[]
    if r.get('words',0)<400: score+=4; reasons.append(f"thin:{r.get('words')}w")
    if not r.get('has_nav'): score+=1; reasons.append('no <nav>')
    miss=sum(1 for k in ('privacy-policy.html','terms-of-service.html','disclaimer.html') if not r['policy_links'].get(k))
    if miss>=2: score+=1; reasons.append('policy links missing')
    if r.get('affiliate_markers'): score+=3; reasons.append('affiliate markers')
    if r.get('paid_listing_markers'): score+=3; reasons.append('paid featured listings')
    if r.get('placeholder_links',0): score+=2; reasons.append(f"placeholder links:{r['placeholder_links']}")
    if r.get('country_flat_percent_logic_signal'): score+=2; reasons.append('country-specific title + manual flat-rate inputs')
    if r.get('developer_residue'): score+=2; reasons.append('developer/template residue')
    if r.get('coming_soon'): score+=2; reasons.append('coming soon')
    if r.get('duplicate_h2'): score+=1; reasons.append('duplicate H2')
    if score>=3: sus.append((score,r['path'],reasons,r.get('words')))
sus.sort(reverse=True)

out={'summary':summary,'highest_risk_pages':sus[:100],'near_duplicate_pairs':pairs[:100],'repeated_paragraphs':[{'page_count':n,'paragraph':p[:300],'sample_paths':ps[:30]} for n,p,ps in repeated[:100]],'pages':rows}
open('ADSENSE-FORENSIC-AUDIT.json','w').write(json.dumps(out,indent=2))

md=['# Zaculators AdSense Forensic Audit','',f"Live crawl as Googlebot. Crawled **{summary['crawled_urls']}** URLs, **{summary['html_pages']}** HTML pages.",'','## Summary']
for k,v in summary.items(): md.append(f'- **{k}**: {v}')
md += ['','## Highest-risk pages']
for score,p,reasons,w in sus[:60]: md.append(f'- **{p}** — score {score}, {w} words — '+', '.join(reasons))
md += ['','## Near-duplicate pairs (Jaccard >= .72)']
for j,a,b in pairs[:60]: md.append(f'- {j}: `{a}` ↔ `{b}`')
md += ['','## Most repeated long paragraphs']
for n,p,ps in repeated[:30]: md.append(f'- **{n} pages** — {p[:220]}')
open('ADSENSE-FORENSIC-AUDIT.md','w').write('\n'.join(md)+'\n')
print(json.dumps(summary,indent=2))
