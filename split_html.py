import re
import os

with open('src/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

views = [
    'view-dashboard',
    'view-planning',
    'view-investment',
    'view-schedule',
    'view-todo',
    'view-tax',
    'view-subscriptions'
]

new_html = html

for view in views:
    # Use regex to find the start of the <main> tag and the corresponding </main>
    # Since regex can't easily match nested <div> inside <main>, we'll match by <main ...> and </main>
    pattern = rf'(<main[^>]*id="{view}"[^>]*>)(.*?)(</main>)'
    match = re.search(pattern, new_html, re.DOTALL)
    
    if match:
        start_tag = match.group(1)
        inner_content = match.group(2)
        end_tag = match.group(3)
        
        # Save inner content to src/views/{view}.html
        filename = view.replace('view-', '') + '.html'
        with open(f'src/views/{filename}', 'w', encoding='utf-8') as f_out:
            f_out.write(inner_content)
            
        # Replace the inner content with an INCLUDE comment
        replacement = f"{start_tag}\n        <!-- INCLUDE views/{filename} -->\n    {end_tag}"
        new_html = new_html[:match.start()] + replacement + new_html[match.end():]
        print(f"Extracted {filename}")

with open('src/index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("Done splitting html.")
