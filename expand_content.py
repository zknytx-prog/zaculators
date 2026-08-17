import re
from bs4 import BeautifulSoup

def get_calc_name(title):
    # Strip " | Zaculators" or " Calculator | Zaculators" etc
    name = title.split('|')[0].strip()
    return name

def build_section(calc_name, meta_desc, filename):
    short_name = calc_name.replace(' Calculator','').replace(' calculator','').strip()
    # Clean trailing ellipsis truncation in meta
    desc = meta_desc.rstrip('.…') 
    html = f'''
<section class="expanded-info" style="max-width:920px;margin:2rem auto;padding:2rem;background:white;border:1px solid #e2e8f0;border-radius:12px;">
<h2 style="font-size:1.45rem;margin-bottom:1rem;color:#2563eb;">About the {calc_name}</h2>
<p style="margin-bottom:1rem;line-height:1.7;">{desc}. The {calc_name} on Zaculators is built to give you a fast, reliable answer without spreadsheets or guesswork. Instead of digging through formulas or estimating by hand, you get a clear result in seconds, based on the numbers you enter.</p>
<p style="margin-bottom:1rem;line-height:1.7;">Whether you're checking figures for a one-time decision or comparing several scenarios, this tool is designed to make the math simple and repeatable. Enter your values, review the result, and adjust the inputs to see how the outcome changes.</p>
<h3 style="font-size:1.2rem;margin:1.25rem 0 0.75rem;color:#0f172a;">How to Use the {short_name} Calculator</h3>
<ol style="margin-left:1.25rem;line-height:1.8;">
<li>Enter the required values into the input fields above.</li>
<li>Double-check your entries for accuracy — small input errors can change the result.</li>
<li>Click calculate to see your result instantly.</li>
<li>Adjust any input to compare different scenarios side by side.</li>
</ol>
<h3 style="font-size:1.2rem;margin:1.25rem 0 0.75rem;color:#0f172a;">Who Uses This Calculator</h3>
<p style="margin-bottom:1rem;line-height:1.7;">This calculator is useful for anyone who needs a quick, dependable number without manual calculation — students, professionals, small business owners, and anyone budgeting or planning around this figure. It's built to be simple enough for a first-time visitor while still being precise enough to rely on.</p>
<h3 style="font-size:1.2rem;margin:1.25rem 0 0.75rem;color:#0f172a;">Good to Know</h3>
<p style="margin-bottom:0.5rem;line-height:1.7;"><strong>Is this free to use?</strong> Yes — every calculator on Zaculators is free, with no sign-up required.</p>
<p style="margin-bottom:0.5rem;line-height:1.7;"><strong>Is my data saved or shared?</strong> No. Calculations run in your browser and are not stored or transmitted.</p>
<p style="margin-bottom:0.5rem;line-height:1.7;"><strong>Can I use this on mobile?</strong> Yes, the calculator is fully responsive and works on phones, tablets, and desktops.</p>
<p style="margin-bottom:0.5rem;line-height:1.7;"><strong>How accurate is the result?</strong> The {short_name} calculator uses standard, widely accepted formulas for this type of calculation. Results are only as accurate as the numbers you enter, so it's worth double-checking your inputs if the output looks off.</p>
<h3 style="font-size:1.2rem;margin:1.25rem 0 0.75rem;color:#0f172a;">Related Tools</h3>
<p style="margin-bottom:1rem;line-height:1.7;">Zaculators hosts 250+ free calculators covering finance, business, health, tax, and everyday planning. If the {short_name} calculator isn't exactly what you need, browse the full <a href="/all-calculators.html" style="color:#2563eb;">calculator directory</a> to find a tool built for your specific situation.</p>
</section>
'''
    return html

def process_file(path):
    with open(path, encoding='utf-8', errors='ignore') as f:
        content = f.read()
    soup = BeautifulSoup(content, 'html.parser')
    title = soup.title.string if soup.title and soup.title.string else path
    calc_name = get_calc_name(title)
    meta = soup.find('meta', attrs={'name':'description'})
    meta_desc = meta['content'] if meta else f"Use the {calc_name} to get fast, accurate results"

    if 'expanded-info' in content:
        return False, 0  # already processed

    section_html = build_section(calc_name, meta_desc, path)
    new_content = content.replace('</body>', section_html + '\n</body>')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    return True, len(new_content)

if __name__ == '__main__':
    import sys
    process_file(sys.argv[1])
