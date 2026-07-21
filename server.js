require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Fallback Mock Data State
let mockState = {
    speed: 0,
    battery: 80,
    range: 340,
    gear: 'P',
    temp: 32,
    odometer: 12450,
    tires: { FL: 42, FR: 42, RL: 42, RR: 42 },
    lat: 13.7563,
    lon: 100.5018,
    isMock: true
};

// Simulate mock movement over time if requested
setInterval(() => {
    if (mockState.gear === 'D') {
        mockState.speed = Math.floor(Math.random() * 20) + 40; // 40-60 km/h
        mockState.odometer += 0.01;
        mockState.battery = Math.max(10, mockState.battery - 0.01);
    } else {
        mockState.speed = 0;
    }
}, 3000);

// Proxy Endpoint to fetch Tesla Data
app.get('/api/vehicle_data', async (req, res) => {
    const token = process.env.TESLA_BEARER_TOKEN;
    const vid = process.env.TESLA_VEHICLE_ID;

    // If no credentials, return Mock data
    if (!token || !vid) {
        return res.json({
            success: true,
            source: 'mock',
            data: mockState,
            message: "Using mock data. Please configure .env with TESLA_BEARER_TOKEN and TESLA_VEHICLE_ID for real data."
        });
    }

    // If credentials exist, fetch from Official Tesla Fleet API
    try {
        const response = await axios.get(`https://owner-api.teslamotors.com/api/1/vehicles/${vid}/vehicle_data`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            timeout: 5000
        });

        const vData = response.data.response;
        
        // Map official Tesla API response to our unified format
        const unifiedData = {
            speed: vData.drive_state.speed ? Math.round(vData.drive_state.speed * 1.60934) : 0, // mph to km/h
            battery: vData.charge_state.battery_level,
            range: Math.round(vData.charge_state.battery_range * 1.60934),
            gear: vData.drive_state.shift_state || 'P',
            temp: vData.climate_state.outside_temp,
            odometer: Math.round(vData.vehicle_state.odometer * 1.60934),
            tires: {
                FL: (vData.vehicle_state.tpms_pressure_fl * 14.5038).toFixed(1) || 42, // bar to psi
                FR: (vData.vehicle_state.tpms_pressure_fr * 14.5038).toFixed(1) || 42,
                RL: (vData.vehicle_state.tpms_pressure_rl * 14.5038).toFixed(1) || 42,
                RR: (vData.vehicle_state.tpms_pressure_rr * 14.5038).toFixed(1) || 42
            },
            lat: vData.drive_state.latitude,
            lon: vData.drive_state.longitude,
            isMock: false
        };

        res.json({
            success: true,
            source: 'live',
            data: unifiedData
        });

    } catch (error) {
        console.error("Tesla API Error:", error.response ? error.response.data : error.message);
        
        // Return 500 or fallback to mock
        res.status(502).json({
            success: false,
            message: "Failed to connect to Tesla API. Is the car asleep?",
            error: error.message
        });
    }
});

// Endpoint to simulate putting car in Drive (for mock testing)
app.post('/api/mock/gear', (req, res) => {
    const { gear } = req.body;
    if (['P', 'R', 'N', 'D'].includes(gear)) {
        mockState.gear = gear;
        res.json({ success: true, gear });
    } else {
        res.status(400).json({ error: "Invalid gear" });
    }
});

app.listen(PORT, () => {
    console.log(`Tesla Proxy Server running on http://localhost:${PORT}`);
    console.log(`Test endpoint: http://localhost:${PORT}/api/vehicle_data`);
});
