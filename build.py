import re
import os

def build():
    print("Building finance-dashboard...")
    
    with open('src/index.html', 'r', encoding='utf-8') as f:
        html = f.read()
        
    def replacer(match):
        filename = match.group(1).strip()
        filepath = os.path.join('src', filename)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f_view:
                print(f"  Including {filepath}")
                return f_view.read()
        else:
            print(f"  WARNING: Could not find {filepath}")
            return match.group(0)

    # Regex to match <!-- INCLUDE views/X.html -->
    pattern = r'<!--\s*INCLUDE\s+(views/[\w.-]+)\s*-->'
    built_html = re.sub(pattern, replacer, html)
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(built_html)
        
    print("Build complete! Output saved to index.html")

if __name__ == '__main__':
    build()
