const express = require('express');
const cors = require('cors');
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

let latestIotData = {
    placesRestantes: '--',
    placesHandicapeesRestantes: '--',
    isConnected: false
};

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1463643210458071178/f_8jwjZXr_rnmlNj_cvEah3Dkn-cuZUPQjnwe6q1AzJvR5Lq4FdEhc5FjQ_bMAOrUUae";
let parkingFullNotified = false;

app.post('/api/admin/reset', (req, res) => {
    const { count, password } = req.body;
    
    // Trim removes any accidental whitespace from input or env
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

app.post('/api/data', async (req, res) => {
    const { placesRestantes, placesHandicapeesRestantes } = req.body;

    if (placesRestantes !== undefined && placesHandicapeesRestantes !== undefined) {
        latestIotData = {
            placesRestantes: parseInt(placesRestantes, 10),
            placesHandicapeesRestantes: parseInt(placesHandicapeesRestantes, 10),
            isConnected: true
        };

        if (latestIotData.placesRestantes === 0 && !parkingFullNotified) {
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
                            fields: [{ name: "Places Handicapées", value: `${latestIotData.placesHandicapeesRestantes}`, inline: true }],
                            timestamp: new Date().toISOString()
                        }]
                    })
                });
                parkingFullNotified = true;
            } catch (err) { console.error("Discord Error:", err); }
        } else if (latestIotData.placesRestantes > 0) {
            parkingFullNotified = false;
        }

        res.status(200).send({ message: 'Données reçues', data: latestIotData });
    } else {
        res.status(400).send({ message: 'Format invalide' });
    }
});

app.get('/api/data', (req, res) => {
    res.json(latestIotData);
});

app.listen(port, () => {
    console.log(`Backend IoT démarré sur http://localhost:${port}`);
});
