#!/usr/bin/env python3
"""
Zaculators Batch Redesign Script
Updates all 183 HTML calculators with modern design, dark mode, responsive layout
Preserves existing calculator logic
"""

import os
import re
from pathlib import Path

# HEADER TEMPLATE
HEADER = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} | Zaculators</title>
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3736768574278789" crossorigin="anonymous"></script>
    <style>
        :root {{
            --primary: #2563eb;
            --primary-dark: #1e40af;
            --accent: #10b981;
            --bg-light: #f8fafc;
            --bg-dark: #0f172a;
            --text-light: #0f172a;
            --text-dark: #f1f5f9;
            --border-light: #e2e8f0;
            --border-dark: #334155;
            --card-light: #ffffff;
            --card-dark: #1e293b;
            --input-light: #f1f5f9;
            --input-dark: #334155;
        }}

        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-light);
            color: var(--text-light);
            transition: background 0.3s, color 0.3s;
        }}

        body.dark-mode {{
            background: var(--bg-dark);
            color: var(--text-dark);
        }}

        header {{
            background: var(--card-light);
            border-bottom: 1px solid var(--border-light);
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }}

        body.dark-mode header {{
            background: var(--card-dark);
            border-bottom-color: var(--border-dark);
        }}

        .logo {{
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--primary);
            text-decoration: none;
        }}

        .theme-toggle {{
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1.5rem;
            color: var(--text-light);
        }}

        body.dark-mode .theme-toggle {{
            color: var(--text-dark);
        }}

        main {{
            max-width: 600px;
            margin: 0 auto;
            padding: 2rem;
        }}

        .calculator-container {{
            background: var(--card-light);
            border-radius: 16px;
            padding: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            margin-bottom: 2rem;
        }}

        body.dark-mode .calculator-container {{
            background: var(--card-dark);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }}

        h1 {{
            font-size: 1.75rem;
            margin-bottom: 0.5rem;
            color: var(--primary);
        }}

        h2 {{
            font-size: 1.25rem;
            color: var(--primary);
            margin: 1.5rem 0 1rem 0;
        }}

        .subtitle {{
            color: #64748b;
            margin-bottom: 2rem;
            font-size: 0.95rem;
        }}

        body.dark-mode .subtitle {{
            color: #cbd5e1;
        }}

        .form-group {{
            margin-bottom: 1.5rem;
        }}

        label {{
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            font-size: 0.95rem;
        }}

        input[type="number"],
        input[type="text"],
        input[type="date"],
        select {{
            width: 100%;
            padding: 0.75rem;
            border: 2px solid var(--border-light);
            border-radius: 8px;
            font-size: 1rem;
            background: var(--input-light);
            color: var(--text-light);
            transition: border-color 0.2s;
            font-family: inherit;
        }}

        body.dark-mode input[type="number"],
        body.dark-mode input[type="text"],
        body.dark-mode input[type="date"],
        body.dark-mode select {{
            background: var(--input-dark);
            color: var(--text-dark);
            border-color: var(--border-dark);
        }}

        input[type="number"]:focus,
        input[type="text"]:focus,
        input[type="date"]:focus,
        select:focus {{
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }}

        button {{
            width: 100%;
            padding: 1rem;
            background: linear-gradient(135deg, var(--primary), var(--accent));
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
        }}

        button:hover {{
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
        }}

        button:active {{
            transform: translateY(0);
        }}

        .results {{
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(37, 99, 235, 0.08));
            border: 2px solid var(--accent);
            border-radius: 12px;
            padding: 1.5rem;
            margin-top: 2rem;
            display: none;
        }}

        body.dark-mode .results {{
            background: rgba(16, 185, 129, 0.05);
        }}

        .results.active {{
            display: block;
            animation: slideIn 0.3s ease;
        }}

        @keyframes slideIn {{
            from {{
                opacity: 0;
                transform: translateY(10px);
            }}
            to {{
                opacity: 1;
                transform: translateY(0);
            }}
        }}

        .result-item {{
            margin-bottom: 1.5rem;
        }}

        .result-item:last-child {{
            margin-bottom: 0;
        }}

        .result-label {{
            font-size: 0.85rem;
            color: #64748b;
            margin-bottom: 0.25rem;
            font-weight: 500;
        }}

        body.dark-mode .result-label {{
            color: #94a3b8;
        }}

        .result-value {{
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--accent);
        }}

        .back-link {{
            display: inline-block;
            color: var(--primary);
            text-decoration: none;
            font-weight: 600;
            margin-bottom: 1rem;
            transition: color 0.2s;
        }}

        .back-link:hover {{
            color: var(--primary-dark);
        }}

        footer {{
            text-align: center;
            padding: 2rem;
            color: #64748b;
            font-size: 0.9rem;
        }}

        body.dark-mode footer {{
            color: #94a3b8;
        }}

        @media (max-width: 600px) {{
            main {{
                padding: 1rem;
            }}
            .calculator-container {{
                padding: 1.5rem;
            }}
            h1 {{
                font-size: 1.5rem;
            }}
            .result-value {{
                font-size: 1.5rem;
            }}
        }}
    </style>
</head>
<body>
    <header>
        <a href="/" class="logo">🧮 Zaculators</a>
        <button class="theme-toggle" onclick="toggleDarkMode()">🌙</button>
    </header>

    <main>
        <a href="/" class="back-link">← Back to all calculators</a>

        <div class="calculator-container">
            <h1>{title}</h1>
            <p class="subtitle">{description}</p>

            <form id="calcForm">
                {form_content}
                <button type="submit">Calculate</button>
            </form>

            <div id="results" class="results">
                {results_template}
            </div>
        </div>

        <footer>
            <p>💡 This calculator is free to use. Your data is never stored or shared.</p>
            <p style="margin-top: 1rem; opacity: 0.7;">© 2026 Zaculators | All rights reserved</p>
        </footer>
    </main>

    <script>
        function toggleDarkMode() {{
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
            updateThemeButton();
        }}

        function updateThemeButton() {{
            const btn = document.querySelector('.theme-toggle');
            btn.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
        }}

        if (localStorage.getItem('darkMode') === 'true') {{
            document.body.classList.add('dark-mode');
        }}
        updateThemeButton();

        {calculator_script}
    </script>
</body>
</html>'''

def extract_form_content(html):
    """Extract form inputs from original HTML"""
    match = re.search(r'<form[^>]*>(.*?)</form>', html, re.DOTALL)
    if match:
        form_html = match.group(1)
        # Clean up form HTML to match new style
        form_html = re.sub(r'<input[^>]*>', lambda m: wrap_input(m.group(0)), form_html)
        return form_html.strip()
    return '<div class="form-group"><label>Input 1</label><input type="number" id="input1" required></div>'

def wrap_input(input_tag):
    """Wrap individual inputs in form-group divs"""
    # Check if already wrapped
    if 'form-group' in input_tag:
        return input_tag
    
    # Extract label if exists
    label_match = re.search(r'<label[^>]*>([^<]+)</label>', input_tag)
    label = label_match.group(1) if label_match else 'Input'
    
    # Check if input has ID
    id_match = re.search(r'id=["\']([^"\']+)["\']', input_tag)
    input_id = id_match.group(1) if id_match else 'input1'
    
    return f'<div class="form-group"><label for="{input_id}">{label}</label>{input_tag}</div>'

def extract_script(html):
    """Extract calculator script logic"""
    match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
    if match:
        script = match.group(1)
        # Remove the outer addEventListener wrapper, keep just the logic
        script = re.sub(r"document\.getElementById\(['\"].*?['\"]\)\.addEventListener.*?\{", '', script, flags=re.DOTALL)
        script = script.rsplit('}', 1)[0]  # Remove closing brace
        return script.strip()
    return ''

def extract_results_template(html):
    """Extract results section"""
    match = re.search(r'<div[^>]*id=["\']results["\'][^>]*>(.*?)</div>', html, re.DOTALL)
    if match:
        return match.group(1).strip()
    return '<div class="result-item"><div class="result-label">Result</div><div class="result-value" id="resultValue">-</div></div>'

def extract_title_and_description(filename):
    """Generate title from filename"""
    title = filename.replace('.html', '').replace('-', ' ').title()
    return title, f"Calculate {title.lower()} instantly with this free online calculator."

def process_file(filepath):
    """Process a single HTML file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            original_html = f.read()
        
        filename = os.path.basename(filepath)
        title, description = extract_title_and_description(filename)
        
        form_content = extract_form_content(original_html)
        script = extract_script(original_html)
        results = extract_results_template(original_html)
        
        # Build new HTML
        new_html = HEADER.format(
            title=title,
            description=description,
            form_content=form_content,
            results_template=results,
            calculator_script=script
        )
        
        return new_html
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return None

def batch_update(folder_path):
    """Update all HTML files in folder"""
    folder = Path(folder_path)
    html_files = list(folder.glob('*.html'))
    
    print(f"Found {len(html_files)} HTML files")
    
    updated = 0
    errors = 0
    
    for filepath in sorted(html_files):
        print(f"Processing {filepath.name}...", end=' ')
        new_html = process_file(filepath)
        
        if new_html:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_html)
            print("✓")
            updated += 1
        else:
            print("✗")
            errors += 1
    
    print(f"\n✅ Updated: {updated}")
    print(f"❌ Errors: {errors}")
    return updated, errors

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 2:
        folder = 'C:\\Users\\1zkny\\zaculators-fresh'
        print(f"Using default folder: {folder}")
    else:
        folder = sys.argv[1]
    
    if os.path.isdir(folder):
        batch_update(folder)
    else:
        print(f"Error: Folder not found: {folder}")
