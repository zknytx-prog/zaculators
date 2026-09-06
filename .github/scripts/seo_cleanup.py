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

# 1) Keep only canonical URLs in sitemap.
sitemap_path = Path("sitemap.xml")
sitemap = sitemap_path.read_text(encoding="utf-8")
sitemap = sitemap.replace("<url><loc>https://zaculators.com/index.html</loc></url>\n", "")
for old, new in ALIASES.items():
    old_line = f"<url><loc>https://zaculators.com/{old}</loc></url>"
    new_line = f"<url><loc>https://zaculators.com/{new}</loc></url>"
    if old_line in sitemap:
        sitemap = sitemap.replace(old_line, new_line)
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
        # Remove explicit list/card entries for the deprecated alias when a canonical entry exists.
        text = re.sub(rf'<li><a href="{re.escape(old)}">.*?</a></li>\s*', '', text, flags=re.S)
        text = re.sub(rf"['\"]{re.escape(old)}['\"]\s*,\s*", '', text)
        text = re.sub(rf",\s*['\"]{re.escape(old)}['\"]", '', text)
    directory_path.write_text(text, encoding="utf-8")

# 3) Update internal links so pages link directly to canonical URLs, not redirects.
for path in Path(".").rglob("*.html"):
    if path.name in ALIASES:
        # These legacy alias files are intentionally retained as redirect fallbacks.
        continue
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new in ALIASES.items():
        text = text.replace(f'href="{old}"', f'href="{new}"')
        text = text.replace(f"href='{old}'", f"href='{new}'")
        text = text.replace(f'href="/{old}"', f'href="/{new}"')
        text = text.replace(f"href='/{old}'", f"href='/{new}'")
        text = text.replace(f"https://zaculators.com/{old}", f"https://zaculators.com/{new}")
    if text != original:
        path.write_text(text, encoding="utf-8")

print("SEO canonical cleanup complete")
