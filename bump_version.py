import json
import re
import os
from datetime import datetime

VERSION_FILE = 'version.json'
INDEX_FILE = 'index.html'

def bump_version():
    today = datetime.now().strftime('%Y-%m-%d')
    
    # Default state if file doesn't exist
    if not os.path.exists(VERSION_FILE):
        data = {
            "major": 4,
            "minor": 92,
            "last_edit_date": today
        }
    else:
        with open(VERSION_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
    # Major: increment if the date has changed
    if data['last_edit_date'] != today:
        data['major'] += 1
        data['last_edit_date'] = today
        
    # Minor: increment every time this script is run
    data['minor'] += 1
    
    # Save back to version.json
    with open(VERSION_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)
        
    new_version_str = f"v{data['major']}.{data['minor']} by Tu13u1E+"
    
    # Update index.html
    if os.path.exists(INDEX_FILE):
        with open(INDEX_FILE, 'r', encoding='utf-8') as f:
            html_content = f.read()
            
        # Regex to find the version div and replace the text
        pattern = r'(<div class="app-version">)v\d+\.\d+ by Tu13u1E\+(</div>)'
        new_html_content = re.sub(pattern, rf'\g<1>{new_version_str}\g<2>', html_content)
        
        with open(INDEX_FILE, 'w', encoding='utf-8') as f:
            f.write(new_html_content)
            
        print(f"Successfully bumped version to {new_version_str}!")
    else:
        print(f"Error: {INDEX_FILE} not found.")

if __name__ == '__main__':
    bump_version()
