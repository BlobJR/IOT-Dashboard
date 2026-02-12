const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const crypto = require('crypto');
require('dotenv').config(); 
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// --- DEBUG SECTION ---
console.log("--- DEBUG ENV ---");
console.log("Current Directory:", process.cwd());
console.log("ADMIN_PASSWORD length:", process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.length : 'undefined');
console.log("ADMIN_PASSWORD value:", process.env.ADMIN_PASSWORD);
console.log("-----------------");
// ---------------------

// --- CONFIGURATION MQTT ---
const MQTT_BROKER = "mqtt://10.191.64.101"; 
const MQTT_STATUS_TOPIC = "cesi/pau/parking/zoneA/status";
const MQTT_TIME_TOPIC = "cesi/pau/parking/zoneA/time";

const SECRET_KEYS = {
    "A1": "CLE_A1_SECURE",
    "PMR1": "CLE_PMR_SECURE"
};

let currentZoneCounts = {
    "A1": 0,
    "PMR1": 0
};

let last_hashes = {
    "A1": "0000000000000000",
    "PMR1": "0000000000000000"
};

let latestIotData = {
    placesRestantes: '--',
    placesHandicapeesRestantes: '--',
    isConnected: false
};

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1463643210458071178/f_8jwjZXr_rnmlNj_cvEah3Dkn-cuZUPQjnwe6q1AzJvR5Lq4FdEhc5FjQ_bMAOrUUae";
let parkingFullNotified = false;

// --- MQTT CLIENT ---
const client = mqtt.connect(MQTT_BROKER, {
    clientId: "Server_Final_Node_" + Math.random().toString(16).substr(2, 8),
    keepalive: 60,
    connectTimeout: 5000
});

function syncTime() {
    // Envoie l'heure pour l'initialisation des Arduinos
    // Format Python: %d%m%Y%H%M%S -> DDMMYYYYHHMMSS
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
    console.log(`[SYNC] Heure envoyée : ${timeStr}`);
}

client.on('connect', () => {
    console.log(`Serveur connecté au Broker (${MQTT_BROKER})`);
    client.subscribe(MQTT_STATUS_TOPIC, (err) => {
        if (!err) {
            console.log(`Abonné à ${MQTT_STATUS_TOPIC}`);
            syncTime();
        } else {
            console.error("Erreur d'abonnement:", err);
        }
    });
});

client.on('error', (err) => {
    console.error('MQTT Error:', err);
});

client.on('message', async (topic, message) => {
    if (topic === MQTT_STATUS_TOPIC) {
        try {
            const payloadStr = message.toString();
            // console.log("Payload brut reçu:", payloadStr);
            const payload = JSON.parse(payloadStr);
            const source = payload.source;
            const blockchain_msg = payload.data; // Format: SEQ|ID|LIBRES|PREV:SIGNATURE
            
            if (!blockchain_msg) return;

            // 1. Vérification Cryptographique
            const parts = blockchain_msg.split(':');
            if (parts.length !== 2) {
                console.warn("Format message invalide (manque signature)");
                return;
            }
            
            const data_part = parts[0];
            const sig_recue = parts[1];
            
            const key = SECRET_KEYS[source];
            if (!key) {
                console.warn(`Source inconnue: ${source}`);
                return;
            }

            const hmac = crypto.createHmac('sha256', key);
            hmac.update(data_part);
            const expected_sig = hmac.digest('hex').substring(0, 16); 

            if (sig_recue !== expected_sig) {
                console.error(`🚨 ALERTE : Fraude détectée sur ${source} !`);
                return;
            }

                        // 2. Extraction des données de places
                        const dataParts = data_part.split('|');
                        // SEQ|ID|LIBRES|PREV
                        const places_libres_du_bloc = parseInt(dataParts[2], 10);
                        const prev_hash = dataParts[3];
            
                        console.log(`
            --- Mise à jour Parking [${new Date().toLocaleTimeString()}] ---
            `);
            
                        // Mise à jour des compteurs par zone
                        if (source === "PMR1") {
                            // PMR1 est la source faisant foi pour la zone PMR
                            currentZoneCounts.PMR1 = places_libres_du_bloc;
                            
                            // Si PMR1 transporte aussi l'info A1, on peut s'en servir (fallback ou sync)
                            // Mais si A1 envoie ses propres messages, on laissera A1 mettre à jour sa partie plus tard.
                            // Pour l'instant, on accepte la donnée A1 relayée par PMR1 pour initialiser ou corriger.
                            if (payload.libres_A1 !== undefined) {
                                currentZoneCounts.A1 = parseInt(payload.libres_A1, 10);
                            }
                            console.log(`📍 ZONE PMR (via PMR1) : ${currentZoneCounts.PMR1} places libres`);
            
                        } else if (source === "A1") {
                            // A1 est la source directe pour la zone A1
                            currentZoneCounts.A1 = places_libres_du_bloc;
                            console.log(`📡 Update direct de A1 : ${currentZoneCounts.A1} places libres`);
                        }
            
                        // Calcul du global à chaque message (peu importe la source)
                        const total = currentZoneCounts.PMR1 + currentZoneCounts.A1;
                        
                        console.log(`📊 TOTAL GÉNÉRAL (Calculé) : ${total} places disponibles (PMR: ${currentZoneCounts.PMR1}, A1: ${currentZoneCounts.A1})`);
                        
                        // Mise à jour de l'état global
                        latestIotData.placesRestantes = total;
                        latestIotData.placesHandicapeesRestantes = currentZoneCounts.PMR1;
                        latestIotData.isConnected = true;
            
                        // Discord Notification
                        checkParkingFull(total, currentZoneCounts.PMR1);
            
                        // 3. Vérification Blockchain
                        if (prev_hash === last_hashes[source]) {
                            console.log(`🔗 Blockchain : Intègre`);
                        } else {
                            console.log(`⚠️ Blockchain : Rupture de chaîne ! Attendu: ${last_hashes[source]}, Reçu: ${prev_hash}`);
                        }
            
                        last_hashes[source] = sig_recue;
        } catch (e) {
            console.error(`❌ Erreur parsing ou processing : ${e.message}`, e);
        }
    }
});

async function checkParkingFull(total, pmr) {
    if (total === 0 && !parkingFullNotified) {
        try {
            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: "parkingkaka",
                    avatar_url: "https://i.pinimg.com/474x/25/0c/ae/250cae9699677c972da8f2261a3dcbb8.jpg",
                    embeds: [{
                        title: "🚨 ALERTE : PARKING COMPLET",
                        description: "Le parking a atteint sa capacité maximale.",
                        color: 15548997,
                        fields: [{ name: "Places Handicapées", value: `${pmr}`, inline: true }],
                        timestamp: new Date().toISOString()
                    }]
                })
            });
            parkingFullNotified = true;
        } catch (err) { console.error("Discord Error:", err); }
    } else if (total > 0) {
        parkingFullNotified = false;
    }
}

// --- EXPRESS ROUTES ---

app.post('/api/admin/reset', (req, res) => {
    const { count, password } = req.body;
    
    const serverPass = (process.env.ADMIN_PASSWORD || '').trim();
    const userPass = (password || '').trim();

    if (userPass !== serverPass) {
        console.log(`Auth Failed! Server expects: '${serverPass}', User sent: '${userPass}'`);
        return res.status(401).json({ success: false, message: "Mot de passe incorrect." });
    }

    if (count !== undefined) {
        latestIotData = {
            ...latestIotData,
            placesRestantes: parseInt(count, 10),
            isConnected: true
        };
        console.log(`Admin Override : Places mises à jour à ${count}`);
        return res.json({ success: true, message: "Mise à jour réussie !" });
    } else {
        return res.status(400).json({ success: false, message: "Nombre de places manquant." });
    }
});

// Route POST legacy pour compatibilité si d'autres sources push encore via HTTP
app.post('/api/data', async (req, res) => {
    const { placesRestantes, placesHandicapeesRestantes } = req.body;

    if (placesRestantes !== undefined && placesHandicapeesRestantes !== undefined) {
        latestIotData = {
            placesRestantes: parseInt(placesRestantes, 10),
            placesHandicapeesRestantes: parseInt(placesHandicapeesRestantes, 10),
            isConnected: true
        };
        
        // On déclenche aussi la vérif discord ici
        checkParkingFull(latestIotData.placesRestantes, latestIotData.placesHandicapeesRestantes);

        res.status(200).send({ message: 'Données reçues via HTTP', data: latestIotData });
    } else {
        res.status(400).send({ message: 'Format invalide' });
    }
});

app.get('/api/data', (req, res) => {
    res.json(latestIotData);
});

app.listen(port, () => {
    console.log(`Backend IoT démarré sur http://localhost:${port}`);
    console.log(`En attente de connexion MQTT sur ${MQTT_BROKER}...`);
});