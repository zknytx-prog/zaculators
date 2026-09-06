from pathlib import Path
from urllib.parse import urlparse
import json, re, hashlib
from collections import defaultdict

ROOT = Path('.')
html_files = [p for p in ROOT.rglob('*.html') if '.git' not in p.parts]
root_html = [p for p in html_files if len(p.parts) == 1]
nested_html = [p for p in html_files if len(p.parts) > 1]

aliases = {
    'apr-calculator.html':'apr.html','discount-calculator.html':'discount.html',
    'down-payment-calculator.html':'down-payment.html','markup-calculator.html':'markup-tool.html',
    'customer-lifetime-value.html':'customer-ltv.html','gas-mileage.html':'fuel-efficiency.html',
    'payroll-tax.html':'payroll-tax-calculator.html','equity-calculator.html':'home-equity.html',
    'percentage-calculator.html':'percentage.html','break-even-calculator.html':'break-even.html',
    'property-tax-calculator.html':'property-tax.html'
}

def text(path):
    return path.read_text(encoding='utf-8', errors='replace')

def title_of(s):
    m=re.search(r'<title>(.*?)</title>',s,re.I|re.S)
    return re.sub(r'\s+',' ',m.group(1)).strip() if m else ''

def canonical_of(s):
    m=re.search(r'<link[^>]+rel=["\']canonical["\'][^>]*href=["\']([^"\']+)',s,re.I)
    if not m:
        m=re.search(r'<link[^>]+href=["\']([^"\']+)["\'][^>]*rel=["\']canonical["\']',s,re.I)
    return m.group(1) if m else ''

def meta_refresh(s):
    return bool(re.search(r'http-equiv=["\']refresh["\']',s,re.I))

by_title=defaultdict(list); by_canon=defaultdict(list); by_hash=defaultdict(list)
missing_canonical=[]; refresh=[]
for p in html_files:
    s=text(p); rel=p.as_posix()
    t=title_of(s)
    if t: by_title[t].append(rel)
    c=canonical_of(s)
    if c: by_canon[c].append(rel)
    elif rel not in aliases: missing_canonical.append(rel)
    if meta_refresh(s): refresh.append(rel)
    normalized=re.sub(r'\s+',' ',s).strip()
    by_hash[hashlib.sha256(normalized.encode()).hexdigest()].append(rel)

# Link audit for local links. Ignore anchors, mailto/tel/javascript, external and query-only URLs.
broken=[]; nested_links=[]; redirect_links=[]
for p in html_files:
    s=text(p)
    for href in re.findall(r'href=["\']([^"\']+)["\']',s,re.I):
        if not href or href.startswith(('#','mailto:','tel:','javascript:','data:')): continue
        u=urlparse(href)
        if u.scheme in ('http','https'):
            if u.netloc not in ('zaculators.com','www.zaculators.com'): continue
            target=u.path.lstrip('/') or 'index.html'
        elif href.startswith('/'):
            target=u.path.lstrip('/') or 'index.html'
        else:
            target=(p.parent / u.path).as_posix()
        target=target.rstrip('/')
        if not target: target='index.html'
        if target.endswith('/'):
            target += 'index.html'
        candidate=ROOT/target
        if candidate.is_dir(): candidate=candidate/'index.html'
        if not candidate.exists():
            broken.append({'from':p.as_posix(),'href':href,'resolved':candidate.as_posix()})
        if any(target.startswith(f'{d}/') for d in ['1-financial','2-medical','3-business','4-realestate','5-education','6-conversion','7-fitness','8-personal','9-automotive','10-utilities']):
            nested_links.append({'from':p.as_posix(),'href':href})
        base=Path(target).name
        if base in aliases:
            redirect_links.append({'from':p.as_posix(),'href':href,'canonical':aliases[base]})

sitemap=Path('sitemap.xml').read_text(encoding='utf-8') if Path('sitemap.xml').exists() else ''
sitemap_urls=re.findall(r'<loc>(.*?)</loc>',sitemap)
sitemap_paths=[urlparse(u).path.lstrip('/') or 'index.html' for u in sitemap_urls]

nested_by_top=defaultdict(list)
for p in nested_html:
    nested_by_top[p.parts[0]].append(p.as_posix())

same_basename=[]
root_names={p.name:p for p in root_html}
for p in nested_html:
    if p.name in root_names:
        same_basename.append({'nested':p.as_posix(),'root':p.name,'same_bytes':text(p)==text(root_names[p.name])})

report={
    'counts':{'all_html':len(html_files),'root_html':len(root_html),'nested_html':len(nested_html),'sitemap_urls':len(sitemap_urls)},
    'nested_html_by_top_folder':{k:len(v) for k,v in sorted(nested_by_top.items())},
    'nested_same_basename_as_root_count':len(same_basename),
    'nested_same_basename_samples':same_basename[:100],
    'duplicate_titles':{k:v for k,v in by_title.items() if len(v)>1},
    'duplicate_canonical_targets':{k:v for k,v in by_canon.items() if len(v)>1},
    'exact_duplicate_groups':[v for v in by_hash.values() if len(v)>1],
    'meta_refresh_files':sorted(refresh),
    'missing_canonical_count':len(missing_canonical),
    'missing_canonical_samples':sorted(missing_canonical)[:200],
    'broken_internal_links_count':len(broken),
    'broken_internal_links':broken[:500],
    'links_to_nested_legacy_paths_count':len(nested_links),
    'links_to_nested_legacy_paths':nested_links[:200],
    'links_to_redirect_aliases_count':len(redirect_links),
    'links_to_redirect_aliases':redirect_links[:200],
    'sitemap_aliases_present':[p for p in sitemap_paths if Path(p).name in aliases],
    'sitemap_index_html_present':'index.html' in sitemap_paths,
    'sitemap_missing_existing_root_pages':sorted([p.name for p in root_html if p.name not in sitemap_paths and p.name not in aliases and p.name not in ['index.html']])[:500],
    'sitemap_nonexistent_targets':sorted([p for p in sitemap_paths if not (ROOT/p).exists() and p!='index.html'])[:500]
}
Path('seo-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report['counts'],indent=2))
print('broken_internal_links',len(broken))
print('missing_canonical',len(missing_canonical))
print('meta_refresh',len(refresh))
print('nested_same_basename',len(same_basename))
