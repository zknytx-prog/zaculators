import re, json, hashlib
from bs4 import BeautifulSoup
from country_facts import COUNTRY_FACTS

# Second-salt for pages that collided coincidentally (not country-cluster) - forces different variant
FORCE_ALT_SALT = {
    'life-path-number.html': 'alt1',
    'fuel-cost.html': 'alt2',
    'degree-roi.html': 'alt1',
    'corporate-tax-calculator.html': 'alt2',
    'body-fat-percentage.html': 'alt1',
    'net-worth.html': 'alt2',
    'lease-calculator.html': 'alt1',
    'discount.html': 'alt3',
    'ethiopia-income-tax-calculator.html': 'alt3',
    'fitness-level.html': 'alt3',
    'currency-converter.html': 'alt4',
    'max-heart-rate.html': 'alt4',
    'salary-converter-usd-eur.html': 'alt3',
    'salary-converter-usd-cad.html': 'alt4',
    'percentage-decrease-calculator.html': 'alt2',
}

def h(s, n):
    return int(hashlib.md5(s.encode()).hexdigest(), 16) % n

OPENERS = [
    "Rather than reaching for a spreadsheet or doing the math by hand, {name} gives you a straight answer in seconds.",
    "{name} exists so you don't have to dig up a formula or estimate — plug in your numbers and get a real answer.",
    "Skip the manual math: {name} runs the calculation the moment you enter your numbers.",
    "{name} is built for one job — turning your inputs into an accurate result without spreadsheets, apps, or guesswork.",
    "Instead of estimating or hunting for a formula online, {name} does the calculation instantly, right in your browser.",
    "{name} was built to replace the back-of-napkin math with something exact and repeatable.",
]

HOWTO_INTROS = [
    "Here's what it takes to get a result:",
    "Using it is straightforward:",
    "The process takes under a minute:",
    "Getting your number takes just a few steps:",
]

WHOFOR_TEMPLATES = [
    "People turn to this calculator when they need a fast, dependable number instead of estimating — whether that's for a one-off decision or something they check regularly.",
    "This tool is aimed at anyone who wants a precise figure without doing the math themselves, from first-time users to people who use it as part of a regular routine.",
    "It's built for anyone who'd rather trust a calculation than guess — students, professionals, and everyday users checking a number they need to be right.",
    "Whether you're comparing a few scenarios or just need one clean answer, this calculator is meant to save you the manual work.",
]

CLOSING_NOTES = [
    ("Is there a cost to use this?", "No — every calculator on Zaculators is free, with no account or sign-up needed."),
    ("Does it store my information?", "No. The calculation happens in your browser and nothing you enter is saved or sent anywhere."),
    ("Will it work on my phone?", "Yes, the page is fully responsive and works the same on mobile, tablet, or desktop."),
]

ACCURACY_NOTES = [
    "Results depend on standard, widely used formulas for this kind of calculation — accuracy is only as good as the numbers you put in, so it's worth double-checking your inputs.",
    "The math behind this tool follows established, conventional methods — if a result looks off, the most likely cause is an input worth rechecking.",
    "This uses the standard approach used for this type of calculation, so the output should match what you'd get working it out by hand — just with less room for error.",
]

def get_calc_name(title):
    return title.split('|')[0].strip()

def get_labels(soup):
    labels = [l.get_text(strip=True) for l in soup.find_all('label')]
    # clean up units/parens for readability in prose
    return [re.sub(r'\s*\(.*?\)', '', l).strip() for l in labels if l.strip()][:5]

def get_faq_questions(soup):
    qs = []
    for script in soup.find_all('script', type='application/ld+json'):
        try:
            data = json.loads(script.string)
            if data.get('@type') == 'FAQPage':
                qs = [q['name'] for q in data['mainEntity']]
        except Exception:
            pass
    return qs

def build_section(path, calc_name, meta_desc, labels, faq_qs):
    short = calc_name.replace(' Calculator','').replace(' calculator','').strip()
    seed = path + FORCE_ALT_SALT.get(path, '')

    opener = OPENERS[h(seed+'o', len(OPENERS))].format(name=calc_name)
    howto_intro = HOWTO_INTROS[h(seed+'h', len(HOWTO_INTROS))]
    whofor = WHOFOR_TEMPLATES[h(seed+'w', len(WHOFOR_TEMPLATES))]
    accuracy = ACCURACY_NOTES[h(seed+'a', len(ACCURACY_NOTES))]

    if labels:
        input_desc = "You'll enter " + ", ".join(labels[:-1]) + (" and " + labels[-1] if len(labels) > 1 else labels[0]) + ", and the calculator handles the rest."
    else:
        input_desc = "Enter your details into the fields above and the calculator handles the rest."

    steps_html = f"<li>Fill in {labels[0].lower() if labels else 'your details'} and the other fields above.</li><li>Check your entries — accuracy depends on what you put in.</li><li>The result updates instantly, no submit button or page reload needed.</li>"
    if len(labels) > 1:
        steps_html = f"<li>Enter {labels[0].lower()}.</li><li>Add {', '.join(l.lower() for l in labels[1:])}.</li><li>Review the result — adjust any field to see it update live.</li>"

    faq_extra = ""
    if faq_qs:
        faq_extra = f"<p style=\"margin-top:1rem;line-height:1.7;\">This page also answers common questions like \"{faq_qs[0]}\" and \"{faq_qs[-1] if len(faq_qs)>1 else faq_qs[0]}\" — see the FAQ section above for details.</p>"

    fact_block = ""
    if path in COUNTRY_FACTS:
        fact_headers = ["Current Rate", "Where the Rate Stands", "The Numbers Right Now", "What's in Effect Today"]
        fh_text = fact_headers[h(seed+'fh', len(fact_headers))]
        fact_block = f'''<h3 style="font-size:1.2rem;margin:1.25rem 0 0.75rem;color:#0f172a;">{fh_text}</h3>
<p style="margin-bottom:1rem;line-height:1.7;">{COUNTRY_FACTS[path]}</p>'''

    cn1, ca1 = CLOSING_NOTES[h(seed+'c1', len(CLOSING_NOTES))]
    remaining = [c for c in CLOSING_NOTES if c[0] != cn1]
    cn2, ca2 = remaining[h(seed+'c2', len(remaining))]

    html = f'''
<section class="expanded-info" style="max-width:920px;margin:2rem auto;padding:2rem;background:white;border:1px solid #e2e8f0;border-radius:12px;">
<h2 style="font-size:1.45rem;margin-bottom:1rem;color:#2563eb;">About the {calc_name}</h2>
<p style="margin-bottom:1rem;line-height:1.7;">{meta_desc}. {opener}</p>
<p style="margin-bottom:1rem;line-height:1.7;">{input_desc}</p>
<h3 style="font-size:1.2rem;margin:1.25rem 0 0.75rem;color:#0f172a;">How to Use It</h3>
<p style="margin-bottom:0.5rem;line-height:1.7;">{howto_intro}</p>
<ol style="margin-left:1.25rem;line-height:1.8;">{steps_html}</ol>
<h3 style="font-size:1.2rem;margin:1.25rem 0 0.75rem;color:#0f172a;">Who This Is For</h3>
<p style="margin-bottom:1rem;line-height:1.7;">{whofor}</p>
{faq_extra}
{fact_block}
<h3 style="font-size:1.2rem;margin:1.25rem 0 0.75rem;color:#0f172a;">Good to Know</h3>
<p style="margin-bottom:0.5rem;line-height:1.7;"><strong>{cn1}</strong> {ca1}</p>
<p style="margin-bottom:0.5rem;line-height:1.7;"><strong>{cn2}</strong> {ca2}</p>
<p style="margin-bottom:0.5rem;line-height:1.7;"><strong>How accurate is this?</strong> {accuracy}</p>
<h3 style="font-size:1.2rem;margin:1.25rem 0 0.75rem;color:#0f172a;">A Note on Precision</h3>
<p style="margin-bottom:1rem;line-height:1.7;">Small changes in your inputs can shift the result more than you'd expect, so it's worth running the numbers more than once if you're using this for something important. Treat the output as a strong estimate built on the figures you provide, not a substitute for professional advice where real money or decisions are on the line.</p>
<h3 style="font-size:1.2rem;margin:1.25rem 0 0.75rem;color:#0f172a;">Explore More</h3>
<p style="margin-bottom:1rem;line-height:1.7;">Zaculators has 250+ free calculators spanning finance, business, health, tax, and everyday planning. Browse the full <a href="/all-calculators.html" style="color:#2563eb;">calculator directory</a> if {short} isn't quite the tool you're after.</p>
</section>
'''
    return html

def process_file(path):
    with open(path, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    if 'expanded-info' in content:
        return False, 0
    soup = BeautifulSoup(content, 'html.parser')
    title = soup.title.string if soup.title and soup.title.string else path
    calc_name = get_calc_name(title)
    meta = soup.find('meta', attrs={'name':'description'})
    meta_desc = (meta['content'] if meta else f"Use the {calc_name} to get fast, accurate results").rstrip('.…')
    labels = get_labels(soup)
    faq_qs = get_faq_questions(soup)

    section_html = build_section(path, calc_name, meta_desc, labels, faq_qs)
    new_content = content.replace('</body>', section_html + '\n</body>')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    return True, len(new_content)
