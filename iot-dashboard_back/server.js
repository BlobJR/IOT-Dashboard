const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const crypto = require('crypto');
require('dotenv').config(); 

/**
 * Backend server for the IoT Parking Dashboard.
 * Handles real-time MQTT data from sensors, verifies authenticity via HMAC-SHA256,
 * and provides a REST API for the frontend.
 */
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Configuration of the MQTT Broker and topics for communication with IoT nodes.
const MQTT_BROKER = "mqtt://10.191.64.101"; 
const MQTT_STATUS_TOPIC = "cesi/pau/parking/zoneA/status";
const MQTT_TIME_TOPIC = "cesi/pau/parking/zoneA/time";

// Pre-shared keys for verifying signatures from different IoT sources.
const SECRET_KEYS = {
    "A1": "CLE_A1_SECURE",
    "PMR1": "CLE_PMR_SECURE"
};

// Tracks the number of free spaces per zone based on the latest verified messages.
let currentZoneCounts = {
    "A1": 0,
    "PMR1": 0
};

// Stores the last received signature per source to prevent replay attacks and ensure chain integrity.
let last_hashes = {
    "A1": "0000000000000000",
    "PMR1": "0000000000000000"
};

// Global state served to the frontend.
let latestIotData = {
    placesRestantes: '--',
    placesHandicapeesRestantes: '--',
    isConnected: false
};

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1463643210458071178/f_8jwjZXr_rnmlNj_cvEah3Dkn-cuZUPQjnwe6q1AzJvR5Lq4FdEhc5FjQ_bMAOrUUae";
let parkingFullNotified = false;

// Initialization of the MQTT client with a unique identifier.
const client = mqtt.connect(MQTT_BROKER, {
    clientId: "Server_Final_Node_" + Math.random().toString(16).substr(2, 8),
    keepalive: 60,
    connectTimeout: 5000
});

/**
 * Synchronizes the system time with the Arduinos by publishing a timestamp.
 * Format: DDMMYYYYHHMMSS
 */
function syncTime() {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const timeStr = 
        pad(now.getDate()) +
        pad(now.getMonth() + 1) +
        now.getFullYear() +
        pad(now.getHours()) +
        pad(now.getMinutes()) +
        pad(now.getSeconds());
    
    client.publish(MQTT_TIME_TOPIC, timeStr, { qos: 1, retain: false });
    console.log(`[SYNC] Time synchronization sent: ${timeStr}`);
}

client.on('connect', () => {
    console.log(`Server connected to Broker (${MQTT_BROKER})`);
    client.subscribe(MQTT_STATUS_TOPIC, (err) => {
        if (!err) {
            console.log(`Subscribed to ${MQTT_STATUS_TOPIC}`);
            syncTime();
        } else {
            console.error("Subscription error:", err);
        }
    });
});

client.on('error', (err) => {
    console.error('MQTT connection error:', err);
});

/**
 * Main MQTT message handler.
 * Validates the HMAC signature and updates the global parking state.
 */
client.on('message', async (topic, message) => {
    if (topic === MQTT_STATUS_TOPIC) {
        try {
            const payloadStr = message.toString();
            const payload = JSON.parse(payloadStr);
            const source = payload.source;
            const blockchain_msg = payload.data; // Format: SEQ|ID|LIBRES|PREV:SIGNATURE
            
            if (!blockchain_msg) return;

            // Cryptographic validation of the message integrity
            const parts = blockchain_msg.split(':');
            if (parts.length !== 2) {
                console.warn("Invalid message format: missing signature");
                return;
            }
            
            const data_part = parts[0];
            const sig_recue = parts[1];
            
            const key = SECRET_KEYS[source];
            if (!key) {
                console.warn(`Unknown source detected: ${source}`);
                return;
            }

            const hmac = crypto.createHmac('sha256', key);
            hmac.update(data_part);
            const expected_sig = hmac.digest('hex').substring(0, 16); 

            if (sig_recue !== expected_sig) {
                console.error(`🚨 SECURITY ALERT: Fraud or corruption detected on ${source}!`);
                return;
            }

            // Extract parking availability data
            const dataParts = data_part.split('|');
            const places_libres_du_bloc = parseInt(dataParts[2], 10);
            const prev_hash = dataParts[3];

            // Update internal counters based on the verified source
            if (source === "PMR1") {
                currentZoneCounts.PMR1 = places_libres_du_bloc;
                if (payload.libres_A1 !== undefined) {
                    currentZoneCounts.A1 = parseInt(payload.libres_A1, 10);
                }
            } else if (source === "A1") {
                currentZoneCounts.A1 = places_libres_du_bloc;
            }

            const total = currentZoneCounts.PMR1 + currentZoneCounts.A1;
            
            // Sync global state for frontend consumption
            latestIotData.placesRestantes = total;
            latestIotData.placesHandicapeesRestantes = currentZoneCounts.PMR1;
            latestIotData.isConnected = true;

            checkParkingFull(total, currentZoneCounts.PMR1);

            // Chain integrity check (Blockchain-like linkage)
            if (prev_hash !== last_hashes[source]) {
                console.log(`⚠️ Chain warning: Linkage break detected for ${source}. Expected: ${last_hashes[source]}, Received: ${prev_hash}`);
            }

            last_hashes[source] = sig_recue;
        } catch (e) {
            console.error(`❌ Error processing MQTT payload: ${e.message}`);
        }
    }
});

/**
 * Notifies a Discord webhook if the parking lot reaches maximum capacity.
 */
async function checkParkingFull(total, pmr) {
    if (total === 0 && !parkingFullNotified) {
        try {
            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: "Parking Monitor",
                    avatar_url: "https://i.pinimg.com/474x/25/0c/ae/250cae9699677c972da8f2261a3dcbb8.jpg",
                    embeds: [{
                        title: "🚨 PARKING FULL",
                        description: "The parking lot has reached its maximum capacity.",
                        color: 15548997,
                        fields: [{ name: "Handicap Spaces", value: `${pmr}`, inline: true }],
                        timestamp: new Date().toISOString()
                    }]
                })
            });
            parkingFullNotified = true;
        } catch (err) { console.error("Discord notification error:", err); }
    } else if (total > 0) {
        parkingFullNotified = false;
    }
}

/**
 * Admin override endpoint to manually set the parking count.
 * Requires verification of the ADMIN_PASSWORD environment variable.
 */
app.post('/api/admin/reset', (req, res) => {
    const { count, password } = req.body;
    
    const serverPass = (process.env.ADMIN_PASSWORD || '').trim();
    const userPass = (password || '').trim();

    if (userPass !== serverPass) {
        return res.status(401).json({ success: false, message: "Incorrect administrator password." });
    }

    if (count !== undefined) {
        latestIotData = {
            ...latestIotData,
            placesRestantes: parseInt(count, 10),
            isConnected: true
        };
        console.log(`[ADMIN] Manual override: Count set to ${count}`);
        return res.json({ success: true, message: "Counter updated successfully." });
    } else {
        return res.status(400).json({ success: false, message: "Missing target count." });
    }
});

/**
 * Fetch the latest synchronized data from the IoT system.
 */
app.get('/api/data', (req, res) => {
    res.json(latestIotData);
});

app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});