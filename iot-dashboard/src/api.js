// src/api.js

/**
 * Récupère les dernières données des capteurs depuis l'API backend.
 */
export async function getSensorData() {
  try {
    const ip = window.location.hostname;
    // Timeout court pour éviter de bloquer si le backend est éteint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`http://${ip}:5000/api/data`, { 
      signal: controller.signal 
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erreur HTTP ! statut: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erreur API:", error);
    return {
      placesRestantes: 'N/A',
      placesHandicapeesRestantes: 'N/A',
      isConnected: false
    };
  }
}

/**
 * Tente de réinitialiser/forcer le compteur de places.
 * Nécessite un mot de passe administrateur.
 * 
 * @param {number} count - Le nouveau nombre de places.
 * @param {string} password - Le mot de passe admin.
 */
export async function resetParkingCount(count, password) {
    try {
        const ip = window.location.hostname;
        const response = await fetch(`http://${ip}:5000/api/admin/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count, password }),
        });

        const data = await response.json();
        
        if (response.status === 401) {
            return { success: false, message: "Mot de passe incorrect !" };
        }
        if (!response.ok) {
            throw new Error(data.message || "Erreur serveur");
        }

        return { success: true, message: "Mise à jour réussie !" };
    } catch (error) {
        console.error("Erreur Reset:", error);
        return { success: false, message: "Erreur de connexion au serveur." };
    }
}

export async function sendCommand(command, payload) {
  try {
    const ip = window.location.hostname;
    const response = await fetch(`http://${ip}:5000/api/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, payload }),
    });

    if (!response.ok) throw new Error(`Status: ${response.status}`);
    return await response.json();
  } catch (error) {
    return { success: false, message: "Échec commande." };
  }
}
