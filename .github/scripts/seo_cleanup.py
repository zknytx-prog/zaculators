from pathlib import Path
import re

ALIASES = {
    "apr-calculator.html": "apr.html",
    "discount-calculator.html": "discount.html",
    "down-payment-calculator.html": "down-payment.html",
    "markup-calculator.html": "markup-tool.html",
    "customer-lifetime-value.html": "customer-ltv.html",
    "gas-mileage.html": "fuel-efficiency.html",
    "payroll-tax.html": "payroll-tax-calculator.html",
    "equity-calculator.html": "home-equity.html",
    "percentage-calculator.html": "percentage.html",
    "break-even-calculator.html": "break-even.html",
    "property-tax-calculator.html": "property-tax.html",
}

# 1) Keep only canonical URLs in sitemap and include every canonical public tool.
sitemap_path = Path("sitemap.xml")
sitemap = sitemap_path.read_text(encoding="utf-8")
sitemap = sitemap.replace("<url><loc>https://zaculators.com/index.html</loc></url>\n", "")
for old, new in ALIASES.items():
    old_line = f"<url><loc>https://zaculators.com/{old}</loc></url>"
    new_line = f"<url><loc>https://zaculators.com/{new}</loc></url>"
    if old_line in sitemap:
        sitemap = sitemap.replace(old_line, new_line)
missing_url = "<url><loc>https://zaculators.com/islamic-inheritance-calculator.html</loc></url>"
if missing_url not in sitemap:
    sitemap = sitemap.replace("</urlset>", missing_url + "\n</urlset>")
# De-duplicate sitemap entries while preserving order.
lines = sitemap.splitlines()
seen = set()
out = []
for line in lines:
    if line.startswith("<url><loc>"):
        if line in seen:
            continue
        seen.add(line)
    out.append(line)
sitemap_path.write_text("\n".join(out) + "\n", encoding="utf-8")

# 2) Remove duplicate aliases from the master directory before global link replacement.
directory_path = Path("all-calculators.html")
if directory_path.exists():
    text = directory_path.read_text(encoding="utf-8")
    for old in ALIASES:
        text = re.sub(rf'<li><a href="{re.escape(old)}">.*?</a></li>\s*', '', text, flags=re.S)
        text = re.sub(rf"['\"]{re.escape(old)}['\"]\s*,\s*", '', text)
        text = re.sub(rf",\s*['\"]{re.escape(old)}['\"]", '', text)
    text = text.replace('Last updated: May 12, 2026', 'Last updated: September 6, 2026')
    directory_path.write_text(text, encoding="utf-8")

# 3) Update internal links so pages link directly to canonical URLs, not redirects.
for path in Path(".").rglob("*.html"):
    if path.name in ALIASES:
        # Legacy alias HTML remains as a fallback; Vercel handles these as server-side 301s.
        continue
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new in ALIASES.items():
        text = text.replace(f'href="{old}"', f'href="{new}"')
        text = text.replace(f"href='{old}'", f"href='{new}'")
        text = text.replace(f'href="/{old}"', f'href="/{new}"')
        text = text.replace(f"href='/{old}'", f"href='/{new}'")
        text = text.replace(f"https://zaculators.com/{old}", f"https://zaculators.com/{new}")
    # Link directly to the canonical homepage instead of /index.html.
    text = text.replace('href="index.html"', 'href="/"').replace("href='index.html'", "href='/'")
    text = text.replace('href="/index.html"', 'href="/"').replace("href='/index.html'", "href='/'")
    if text != original:
        path.write_text(text, encoding="utf-8")

# 4) Add a self-referencing canonical to every indexable canonical HTML page that lacks one.
for path in Path(".").rglob("*.html"):
    if path.name in ALIASES:
        continue
    text = path.read_text(encoding="utf-8")
    if re.search(r'<link[^>]+rel=["\']canonical["\']', text, re.I):
        continue
    rel = path.as_posix()
    if rel == 'index.html':
        canonical = 'https://zaculators.com/'
    elif rel == 'ai-tools/index.html':
        canonical = 'https://zaculators.com/ai-tools/'
    else:
        canonical = 'https://zaculators.com/' + rel
    tag = f'<link rel="canonical" href="{canonical}"/>'
    updated, n = re.subn(r'(<head[^>]*>)', r'\1' + tag, text, count=1, flags=re.I)
    if n:
        path.write_text(updated, encoding="utf-8")

# 5) Repair misleading homepage cards and category CTAs so labels point to the actual matching tools.
index_path = Path('index.html')
if index_path.exists():
    text = index_path.read_text(encoding='utf-8')
    replacements = {
        '<a class="calc-card" href="loan-payoff.html"><div class="calc-icon">💳</div><h3>Loan</h3></a>': '<a class="calc-card" href="loan.html"><div class="calc-icon">💳</div><h3>Loan</h3></a>',
        '<a class="calc-card" href="budget-planner.html"><div class="calc-icon">🍽️</div><h3>Tip</h3></a>': '<a class="calc-card" href="tip.html"><div class="calc-icon">🍽️</div><h3>Tip</h3></a>',
        '<a class="calc-card" href="mortgage.html"><div class="calc-icon">🔁</div><h3>Refinance</h3></a>': '<a class="calc-card" href="refinance.html"><div class="calc-icon">🔁</div><h3>Refinance</h3></a>',
        '<a class="calc-card" href="revenue-projector.html"><div class="calc-icon">🤝</div><h3>Commission</h3></a>': '<a class="calc-card" href="commission.html"><div class="calc-icon">🤝</div><h3>Commission</h3></a>',
        '<a class="calc-card" href="revenue-projector.html"><div class="calc-icon">🏷️</div><h3>Markup</h3></a>': '<a class="calc-card" href="markup-tool.html"><div class="calc-icon">🏷️</div><h3>Markup</h3></a>',
        '<a class="calc-card" href="revenue-projector.html"><div class="calc-icon">🎯</div><h3>Pricing</h3></a>': '<a class="calc-card" href="pricing-optimizer.html"><div class="calc-icon">🎯</div><h3>Pricing</h3></a>',
        '<a class="calc-card" href="budget-planner.html"><div class="calc-icon">📦</div><h3>Inventory</h3></a>': '<a class="calc-card" href="inventory-manager.html"><div class="calc-icon">📦</div><h3>Inventory</h3></a>',
        '<a class="calc-card" href="budget-planner.html"><div class="calc-icon">💵</div><h3>Cash Flow</h3></a>': '<a class="calc-card" href="cash-flow-projection.html"><div class="calc-icon">💵</div><h3>Cash Flow</h3></a>',
        '<a class="calc-card" href="revenue-projector.html"><div class="calc-icon">👥</div><h3>Customer LTV</h3></a>': '<a class="calc-card" href="customer-ltv.html"><div class="calc-icon">👥</div><h3>Customer LTV</h3></a>',
        '<a class="calc-card" href="nutrition-calculator.html"><div class="calc-icon">💧</div><h3>Water Intake</h3></a>': '<a class="calc-card" href="water-intake.html"><div class="calc-icon">💧</div><h3>Water Intake</h3></a>',
        '<a class="calc-card" href="calorie-needs.html"><div class="calc-icon">⚡</div><h3>TDEE</h3></a>': '<a class="calc-card" href="tdee.html"><div class="calc-icon">⚡</div><h3>TDEE</h3></a>',
        '<a class="calc-card" href="scholarship-calculator.html"><div class="calc-icon">🎓</div><h3>GPA</h3></a>': '<a class="calc-card" href="gpa-calculator.html"><div class="calc-icon">🎓</div><h3>GPA</h3></a>',
        '<a class="calc-card" href="financial-aid-calculator.html"><div class="calc-icon">📝</div><h3>Grade Calculator</h3></a>': '<a class="calc-card" href="grade-calculator.html"><div class="calc-icon">📝</div><h3>Grade Calculator</h3></a>',
        '<a class="calc-card" href="financial-aid-calculator.html"><div class="calc-icon">🔄</div><h3>Grade Converter</h3></a>': '<a class="calc-card" href="grade-converter.html"><div class="calc-icon">🔄</div><h3>Grade Converter</h3></a>',
        '<a class="calc-card" href="degree-roi.html"><div class="calc-icon">🏫</div><h3>Tuition Cost</h3></a>': '<a class="calc-card" href="tuition-cost.html"><div class="calc-icon">🏫</div><h3>Tuition Cost</h3></a>',
        '<a class="calc-card" href="financial-aid-calculator.html"><div class="calc-icon">🗓️</div><h3>Study Planner</h3></a>': '<a class="calc-card" href="study-planner.html"><div class="calc-icon">🗓️</div><h3>Study Planner</h3></a>',
        '<a class="calc-card" href="budget-planner.html"><div class="calc-icon">💵</div><h3>Student Budget</h3></a>': '<a class="calc-card" href="student-budget.html"><div class="calc-icon">💵</div><h3>Student Budget</h3></a>',
        '<a class="calc-card" href="event-planner.html"><div class="calc-icon">🗓️</div><h3>Days Between</h3></a>': '<a class="calc-card" href="date-calculator.html"><div class="calc-icon">🗓️</div><h3>Days Between</h3></a>',
        '<div class="section-cta"><a class="more-link" href="#financial">See all financial calculators →</a></div>': '<div class="section-cta"><a class="more-link" href="all-calculators.html#financial">See all financial calculators →</a></div>',
        '<div class="section-cta"><a class="more-link" href="#real-estate">See all real estate calculators →</a></div>': '<div class="section-cta"><a class="more-link" href="all-calculators.html#property">See all real estate calculators →</a></div>',
        '<div class="section-cta"><a class="more-link" href="#business">See all business calculators →</a></div>': '<div class="section-cta"><a class="more-link" href="all-calculators.html#business">See all business calculators →</a></div>',
        '<div class="section-cta"><a class="more-link" href="#health">See all health calculators →</a></div>': '<div class="section-cta"><a class="more-link" href="all-calculators.html#health">See all health calculators →</a></div>',
        '<div class="section-cta"><a class="more-link" href="#education">See all education calculators →</a></div>': '<div class="section-cta"><a class="more-link" href="all-calculators.html#education">See all education calculators →</a></div>',
        '<div class="section-cta"><a class="more-link" href="#categories">See the full calculator directory →</a></div>': '<div class="section-cta"><a class="more-link" href="all-calculators.html">See the full calculator directory →</a></div>',
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    # Keep the more useful detailed trust panel and remove the earlier duplicate summary block.
    duplicate = '<section class="trust">\n<h2>Why Choose Zaculators?</h2>\n<p>Zaculators is built for fast browsing and low-friction decisions. You can jump straight into a single tool, scan category groups quickly, or open the full calculator directory when you want everything in one place.</p>\n</section>\n'
    text = text.replace(duplicate, '')
    text = text.replace('Last updated: May 12, 2026', 'Last updated: September 6, 2026')
    index_path.write_text(text, encoding='utf-8')

# 6) Remove two misleading self-links created by historical alias pages that were never distinct tools.
ltv = Path('customer-ltv.html')
if ltv.exists():
    text = ltv.read_text(encoding='utf-8')
    text = text.replace('<a href="customer-ltv.html">Customer Lifetime Value (Revenue-Based)</a> · <a href="profit-margin.html">Profit Margin</a> · <a href="break-even-sales.html">Break-Even Sales</a>', '<a href="profit-margin.html">Profit Margin</a> · <a href="revenue-projector.html">Revenue Projector</a> · <a href="break-even-sales.html">Break-Even Sales</a>')
    ltv.write_text(text, encoding='utf-8')

markup = Path('markup-tool.html')
if markup.exists():
    text = markup.read_text(encoding='utf-8')
    text = text.replace('<a href="markup-tool.html">Markup Calculator (Single Item)</a> · <a href="profit-margin.html">Profit Margin</a> · <a href="inventory-turnover.html">Inventory Turnover</a>', '<a href="pricing-optimizer.html">Pricing Optimizer</a> · <a href="profit-margin.html">Profit Margin</a> · <a href="inventory-turnover.html">Inventory Turnover</a>')
    text = text.replace('How is this different from the single-item Markup Calculator?', 'How is markup different from profit margin?')
    text = text.replace('The Markup Calculator prices one item. This tool applies one markup rate across multiple items at once to see total batch economics.', 'Markup measures the increase over cost, while profit margin measures profit as a percentage of selling price. This bulk tool applies one markup rate across multiple items and totals the batch economics.')
    text = text.replace('For different rates per item, run each separately in the Markup Calculator.', 'For different rates per item, calculate each item separately or group items that share the same markup rate.')
    markup.write_text(text, encoding='utf-8')

print("SEO canonical and site-quality cleanup complete")