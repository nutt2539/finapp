import urllib.request
import urllib.error
import json
import base64
import os

api_key = "invalid"
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"

# 15MB payload
dummy_data = os.urandom(15 * 1024 * 1024)
b64 = base64.b64encode(dummy_data).decode('utf-8')

payload = {
    "contents": [
        {
            "parts": [
                {"text": "hello"},
                {"inline_data": {"mime_type": "image/jpeg", "data": b64}}
            ]
        }
    ]
}

data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

try:
    response = urllib.request.urlopen(req)
    print(response.getcode())
    print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode('utf-8'))
