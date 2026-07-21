document.addEventListener('DOMContentLoaded', () => {
    // 1. Clock Update
    function updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        document.getElementById('clockTime').innerText = timeStr;
    }
    
    setInterval(updateClock, 1000);
    updateClock();

    // 2. Telemetry State (Mock Data)
    let state = {
        battery: 82.5,
        range: 350,
        temp: 34.2,
        kwh: 0.0,
        mileage: 12450.0,
        tires: {
            fl: 42.1,
            fr: 41.9,
            rl: 42.0,
            rr: 42.2
        },
        gear: 'P',
        lastUpdate: Date.now()
    };

    const batteryValueEl = document.getElementById('batteryValue');
    const batteryRangeEl = document.getElementById('batteryRange');
    const batteryBarEl = document.getElementById('batteryBar');
    const tempValueEl = document.getElementById('tempValue');
    const kwhValueEl = document.getElementById('kwhValue');
    const mileageValueEl = document.getElementById('mileageValue');
    
    // Tire elements
    const tireEl = {
        fl: document.getElementById('tireFL'),
        fr: document.getElementById('tireFR'),
        rl: document.getElementById('tireRL'),
        rr: document.getElementById('tireRR')
    };

    function updateGearDisplay() {
        document.querySelectorAll('.gear-item').forEach(el => {
            if (el.dataset.gear === state.gear) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    }

    function updateTelemetryDisplay() {
        batteryValueEl.innerText = `${Math.floor(state.battery)}%`;
        batteryRangeEl.innerText = `${Math.floor(state.range)} km`;
        batteryBarEl.style.width = `${state.battery}%`;
        
        // Change battery color if low
        if (state.battery < 20) {
            batteryBarEl.style.background = 'var(--tesla-red)';
        } else {
            batteryBarEl.style.background = 'var(--tesla-green)';
        }

        tempValueEl.innerText = `${state.temp.toFixed(1)}°C`;
        kwhValueEl.innerText = `${state.kwh.toFixed(1)} kWh`;
        mileageValueEl.innerText = `${Math.floor(state.mileage).toLocaleString('en-US')} km`;

        // Update Tires
        Object.keys(state.tires).forEach(pos => {
            const psi = state.tires[pos];
            tireEl[pos].innerHTML = `${Math.floor(psi)}<span class="tire-unit">PSI</span>`;
            if (psi < 36) {
                tireEl[pos].classList.add('low-pressure');
            } else {
                tireEl[pos].classList.remove('low-pressure');
            }
        });

        // Update Gear
        updateGearDisplay();
    }

    // Fetch real or mocked vehicle data from the Python Backend
    async function fetchVehicleData() {
        try {
            const response = await fetch('http://localhost:8080/api/vehicle_data');
            const result = await response.json();
            
            if (result.success) {
                const data = result.data;
                // Update State
                state.battery = data.battery;
                state.range = data.range;
                state.temp = data.temp;
                state.gear = data.gear;
                state.mileage = data.odometer;
                state.tires = data.tires;
                
                // If it's real data, kwh isn't easily available per trip without a logger, 
                // so we can estimate or keep it 0 unless we build a trip logger.
                
                updateTelemetryDisplay();
                
                // Update Map and GPS Speed based on backend data
                document.getElementById('speedValue').innerText = data.speed;
                
                // Initialize or update map location
                initMap(data.lat, data.lon, true);
                
                document.getElementById('gpsStatus').innerText = result.source === 'live' 
                    ? 'Connected: Tesla API 🟢' 
                    : 'Mock Data 🟡';
            }
        } catch (error) {
            console.error("Error fetching vehicle data:", error);
            document.getElementById('gpsStatus').innerText = 'Backend Offline 🔴';
        }
    }

    // Poll the backend every 3 seconds
    setInterval(fetchVehicleData, 3000);
    fetchVehicleData();

    // 3. Geolocation / Speedometer / Map
    let watchId = null;
    const speedValueEl = document.getElementById('speedValue');
    const gpsStatusEl = document.getElementById('gpsStatus');
    const mapOverlay = document.getElementById('mapOverlay');
    
    let map = null;
    let carMarker = null;
    let currentTileLayer = null;
    let routingControl = null;
    let isNavigating = false;

    const darkTiles = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const lightTiles = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    function initMap(lat, lon, isRealLocation = false) {
        if (!map) {
            // Initialize Leaflet map
            map = L.map('map', {
                zoomControl: false // Hide zoom controls for cleaner look
            }).setView([lat, lon], 15);

            const isLight = document.body.classList.contains('light-mode');
            
            // Add theme tiles (CartoDB)
            currentTileLayer = L.tileLayer(isLight ? lightTiles : darkTiles, {
                attribution: '&copy; OpenStreetMap contributors',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(map);

            // Add a custom car marker
            const carIcon = L.divIcon({
                className: 'custom-car-marker',
                html: '<div style="width: 24px; height: 24px; background: var(--tesla-green); border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px var(--tesla-green);"></div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            carMarker = L.marker([lat, lon], {icon: carIcon}).addTo(map);
            
            // Initialize Navigation Routing Control
            if (L.Routing && L.Control.Geocoder) {
                routingControl = L.Routing.control({
                    waypoints: [
                        L.latLng(lat, lon)
                        // Second waypoint is empty, user will type it in the UI
                    ],
                    routeWhileDragging: false,
                    geocoder: L.Control.Geocoder.nominatim(),
                    showAlternatives: true,
                    fitSelectedRoutes: false,
                    lineOptions: {
                        styles: [{color: '#3399ff', opacity: 0.8, weight: 6}]
                    },
                    createMarker: function() { return null; }, // Hide default A/B markers
                    // Hide the verbose instruction text to keep it looking clean like a dashboard
                    show: true 
                }).addTo(map);

                // Show buttons when route is found
                routingControl.on('routesfound', function() {
                    const cancelBtn = document.getElementById('cancelNavBtn');
                    const startBtn = document.getElementById('startNavBtn');
                    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
                    if (startBtn && !isNavigating) startBtn.style.display = 'inline-flex';
                });

                // Add Live Autocomplete behavior using Event Delegation
                document.addEventListener('input', function(e) {
                    if (e.target.tagName.toLowerCase() === 'input' && e.target.closest('.leaflet-routing-geocoders')) {
                        const inputs = Array.from(document.querySelectorAll('.leaflet-routing-geocoders input'));
                        // Ensure we only trigger for the destination input (index 1)
                        if (inputs.indexOf(e.target) === 1) {
                            clearTimeout(window._geoTimeout);
                            window._geoTimeout = setTimeout(() => {
                                // Simulate 'Enter' to trigger Leaflet Geocoder lookup
                                // We use a base Event and manually assign keyCode because KeyboardEvent ignores it in some browsers
                                const enterEvent = new Event('keydown', { bubbles: true, cancelable: true });
                                enterEvent.keyCode = 13;
                                enterEvent.which = 13;
                                e.target.dispatchEvent(enterEvent);
                            }, 800); // 800ms debounce
                        }
                    }
                });
            }

            // Hide the overlay so they can see the map immediately
            mapOverlay.style.display = 'none';
        } else if (isRealLocation) {
            // Smoothly pan to new location and update marker
            if (isNavigating) {
                map.flyTo([lat, lon], 18, { animate: true, duration: 1.5 });
            } else {
                map.flyTo([lat, lon], 17, { animate: true, duration: 1.5 });
            }
            carMarker.setLatLng([lat, lon]);
            
            // Update routing start point to current GPS
            if (routingControl) {
                const waypoints = routingControl.getWaypoints();
                if (waypoints.length > 0) {
                    // Force the first waypoint to be the current location with a label
                    waypoints[0] = L.Routing.waypoint(L.latLng(lat, lon), 'Current Location');
                    routingControl.setWaypoints(waypoints);
                }
            }
        }
    }

    // Listen for theme changes from HTML UI
    window.addEventListener('teslaThemeChanged', (e) => {
        if (map && currentTileLayer) {
            map.removeLayer(currentTileLayer);
            currentTileLayer = L.tileLayer(e.detail.isLight ? lightTiles : darkTiles, {
                attribution: '&copy; OpenStreetMap contributors',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(map);
        }
    });

    // Initialize map immediately with a default location (Bangkok)
    initMap(13.7563, 100.5018, false);

    // Global functions for Navigation UI
    window.startNavigation = function() {
        isNavigating = true;
        document.getElementById('startNavBtn').style.display = 'none';
        if (map && carMarker) {
            // Zoom in tight for navigation mode
            map.flyTo(carMarker.getLatLng(), 18, {animate: true, duration: 1});
        }
    };

    window.cancelNavigation = function() {
        isNavigating = false;
        if (routingControl) {
            // Remove the second waypoint to clear the route
            const waypoints = routingControl.getWaypoints();
            if (waypoints.length > 1) {
                // Keep the first waypoint (current location), empty the second
                waypoints[1] = L.Routing.waypoint(); 
                routingControl.setWaypoints(waypoints);
            }
            document.getElementById('cancelNavBtn').style.display = 'none';
            document.getElementById('startNavBtn').style.display = 'none';
        }
    };
});
