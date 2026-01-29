import React, { useState, useEffect } from 'react'
import { getSensorData, resetParkingCount } from '../api'; 
import './Dashboard.css';

const Dashboard = () => {
  const [parkingData, setParkingData] = useState({
    placesRestantes: '--',
    placesHandicapeesRestantes: '--',
    isConnected: false,
  });
  const [lastUpdate, setLastUpdate] = useState('Waiting...');

  // Admin Modal State
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [targetCount, setTargetCount] = useState('');
  const [adminStatus, setAdminStatus] = useState(null); // { type: 'success' | 'error', msg: '' }

  const refreshData = async () => {
    try {
      const data = await getSensorData();
      setParkingData(data);
      if (data.isConnected) {
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (error) {
      setParkingData({ placesRestantes: 'N/A', placesHandicapeesRestantes: 'N/A', isConnected: false });
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000); 
    return () => clearInterval(interval);
  }, []);

  const handleAdminSubmit = async (e) => {
      e.preventDefault();
      setAdminStatus({ type: 'loading', msg: 'Vérification...' });
      
      const result = await resetParkingCount(parseInt(targetCount, 10), adminPassword);
      
      if (result.success) {
          setAdminStatus({ type: 'success', msg: result.message });
          setTimeout(() => {
              setShowAdmin(false);
              setAdminStatus(null);
              setAdminPassword('');
              setTargetCount('');
              refreshData(); // Refresh to show new value
          }, 1500);
      } else {
          setAdminStatus({ type: 'error', msg: result.message });
      }
  };

  return (
    <div className="dashboard">
      <div className="container">
        <header className="header">
          <h1>IOT CONTROL</h1>
          <p className="subtitle">Système de Monitoring</p>
        </header>

        <main className="content">
          <section className="display-section">
            <div className={`status-indicator ${parkingData.isConnected ? 'connected' : 'disconnected'}`}></div>
            
            <h2>PLACES RESTANTES</h2>
            <div className="number-display">
              {parkingData.placesRestantes}
            </div>
            <p className="last-update">Dernière mise à jour: {lastUpdate}</p>
          </section>

          <section className="stats-section">
            <div className="stat-card">
              <h3>PLACES HANDICAPÉES</h3>
              <p className="status-text">{parkingData.placesHandicapeesRestantes}</p>
            </div>
            <div className="stat-card">
              <h3>ÉTAT</h3>
              <p className="status-text" style={{ color: parkingData.isConnected ? '#00ff88' : '#ff3333' }}>
                {parkingData.isConnected ? 'ONLINE' : 'OFFLINE'}
              </p>
            </div>
          </section>
        </main>

        {/* --- SECURE ADMIN BUTTON --- */}
        <div className="admin-footer">
            <button className="admin-toggle" onClick={() => setShowAdmin(true)}>
                🔒 Admin Reset
            </button>
        </div>

        {/* --- ADMIN MODAL --- */}
        {showAdmin && (
            <div className="modal-overlay">
                <div className="admin-modal">
                    <button className="close-btn" onClick={() => setShowAdmin(false)}>×</button>
                    <h3>Administration</h3>
                    <p>Entrez le mot de passe pour forcer le compteur.</p>
                    
                    <form onSubmit={handleAdminSubmit}>
                        <div className="input-group">
                            <label>Nombre de places :</label>
                            <input 
                                type="number" 
                                value={targetCount}
                                onChange={(e) => setTargetCount(e.target.value)}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label>Mot de passe Admin :</label>
                            <input 
                                type="password" 
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                required
                            />
                        </div>

                        {adminStatus && (
                            <div className={`status-msg ${adminStatus.type}`}>
                                {adminStatus.msg}
                            </div>
                        )}

                        <button type="submit" className="btn-submit">Valider</button>
                    </form>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;