import os
import json
import random
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
from urllib.error import URLError, HTTPError

# Load environment variables manually since we don't have python-dotenv
# You can create a .env file and this script will read it
def load_env():
    env_vars = {}
    if os.path.exists('.env'):
        with open('.env') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, val = line.strip().split('=', 1)
                    env_vars[key] = val.strip(' "\'')
    return env_vars

env = load_env()
PORT = int(env.get('PORT', 8080))

# Fallback Mock Data State
mockState = {
    "speed": 0,
    "battery": 80,
    "range": 340,
    "gear": 'P',
    "temp": 32,
    "odometer": 12450,
    "tires": { "FL": 42.1, "FR": 41.9, "RL": 42.0, "RR": 42.2 },
    "lat": 13.7563,
    "lon": 100.5018,
    "isMock": True
}

# Cache for Smart Polling
cached_live_data = None
last_live_fetch_time = 0

class TeslaProxy(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/vehicle_data':
            self.handle_vehicle_data()
        else:
            self.send_response(404)
            self.end_headers()

    def handle_vehicle_data(self):
        # Reload env every time so user doesn't have to restart server
        current_env = load_env()
        token = current_env.get('TESLA_BEARER_TOKEN')
        vid = current_env.get('TESLA_VEHICLE_ID')

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        # If no credentials, return Mock data
        if not token or not vid or token == "put_your_real_token_here":
            # Simulate movement
            if mockState['gear'] == 'D':
                mockState['speed'] = random.randint(40, 60)
                mockState['odometer'] += 0.01
                mockState['battery'] = max(10, mockState['battery'] - 0.01)
            else:
                mockState['speed'] = 0

            response = {
                "success": True,
                "source": "mock",
                "data": mockState,
                "message": "Using mock data. Please configure .env with TESLA_BEARER_TOKEN and TESLA_VEHICLE_ID for real data."
            }
            self.wfile.write(json.dumps(response).encode())
            return

        global cached_live_data, last_live_fetch_time
        
        # Smart Polling: If car is in P, throttle API calls to once every 60 seconds to save battery
        if cached_live_data and cached_live_data['gear'] == 'P':
            if time.time() - last_live_fetch_time < 60:
                res_json = {
                    "success": True,
                    "source": "live (cached - power saving)",
                    "data": cached_live_data
                }
                self.wfile.write(json.dumps(res_json).encode())
                return

        # Fetch from Official Tesla API
        req = urllib.request.Request(f"https://owner-api.teslamotors.com/api/1/vehicles/{vid}/vehicle_data")
        req.add_header('Authorization', f'Bearer {token}')
        
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
                vData = data.get('response', {})
                
                # Map official Tesla API response to our unified format
                unifiedData = {
                    "speed": round(vData['drive_state'].get('speed', 0) * 1.60934) if vData['drive_state'].get('speed') else 0,
                    "battery": vData['charge_state'].get('battery_level', 0),
                    "range": round(vData['charge_state'].get('battery_range', 0) * 1.60934),
                    "gear": vData['drive_state'].get('shift_state') or 'P',
                    "temp": vData['climate_state'].get('outside_temp', 0),
                    "odometer": round(vData['vehicle_state'].get('odometer', 0) * 1.60934),
                    "tires": {
                        "FL": round(vData['vehicle_state'].get('tpms_pressure_fl', 2.9) * 14.5038, 1),
                        "FR": round(vData['vehicle_state'].get('tpms_pressure_fr', 2.9) * 14.5038, 1),
                        "RL": round(vData['vehicle_state'].get('tpms_pressure_rl', 2.9) * 14.5038, 1),
                        "RR": round(vData['vehicle_state'].get('tpms_pressure_rr', 2.9) * 14.5038, 1)
                    },
                    "lat": vData['drive_state'].get('latitude'),
                    "lon": vData['drive_state'].get('longitude'),
                    "isMock": False
                }

                cached_live_data = unifiedData
                last_live_fetch_time = time.time()

                res_json = {
                    "success": True,
                    "source": "live",
                    "data": unifiedData
                }
                self.wfile.write(json.dumps(res_json).encode())

        except Exception as e:
            error_res = {
                "success": False,
                "message": "Failed to connect to Tesla API. Is the car asleep?",
                "error": str(e)
            }
            self.wfile.write(json.dumps(error_res).encode())

print(f"Tesla Proxy Server running on http://localhost:{PORT}")
print(f"Test endpoint: http://localhost:{PORT}/api/vehicle_data")
server = HTTPServer(('0.0.0.0', PORT), TeslaProxy)
server.serve_forever()
