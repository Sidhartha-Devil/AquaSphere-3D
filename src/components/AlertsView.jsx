// src/components/AlertsView.jsx
import React from 'react';
import useOceanStore from '../store/oceanStore';
import './AlertsView.css';

import { INSTRUMENTS, generateOceanGrid } from '../data/mockOceanData';

export default function AlertsView() {
  const userDataset = useOceanStore((s) => s.userDataset);
  const currentTimeStep = useOceanStore((s) => s.currentTimeStep);
  const setCameraTarget = useOceanStore((s) => s.setCameraTarget);
  const setCurrentView = useOceanStore((s) => s.setCurrentView);

  // Generate dynamic live alerts based on the current simulation state
  const activeAlerts = React.useMemo(() => {
    const alerts = [];
    
    if (userDataset && userDataset.length > 0) {
      // Find rows for current timestep
      const timestamps = [...new Set(userDataset.map(d => d.timestamp))].sort();
      const currentTs = timestamps[currentTimeStep % timestamps.length];
      const currentRows = userDataset.filter(d => d.timestamp === currentTs);
      
      currentRows.forEach(row => {
        if (row.temperature > 30.5) {
          alerts.push({ lat: row.latitude, lon: row.longitude, ts: row.timestamp, type: 'heatwave', severity: row.temperature > 32 ? 'critical' : 'warning', title: 'Marine Heatwave', msg: `SST reached ${row.temperature.toFixed(2)}°C.`, reason: 'Prolonged high SST can trigger mass coral bleaching.' });
        }
        if (row.chlorophyll > 5.0) {
          alerts.push({ lat: row.latitude, lon: row.longitude, ts: row.timestamp, type: 'bloom', severity: row.chlorophyll > 10.0 ? 'critical' : 'warning', title: 'Harmful Algal Bloom', msg: `Chlorophyll spiked to ${row.chlorophyll.toFixed(2)} mg/m³.`, reason: 'Excessive growth depletes oxygen (hypoxia), creating toxic dead zones.' });
        }
        const currentSpeed = Math.sqrt((row.u_current||0)**2 + (row.v_current||0)**2);
        if (currentSpeed > 120) {
          alerts.push({ lat: row.latitude, lon: row.longitude, ts: row.timestamp, type: 'current', severity: currentSpeed > 150 ? 'critical' : 'warning', title: 'Extreme Current', msg: `Velocity reached ${currentSpeed.toFixed(0)} cm/s.`, reason: 'Abnormally fast currents severely impact navigation and structural integrity.' });
        }
      });
    } else {
      // Dynamic mock alerts generated directly from the accurate mock data grid
      const grid = generateOceanGrid();
      
      // Shuffle the grid so we get randomized, accurate hotspots rather than fixed ones
      const shuffledGrid = grid.sort(() => 0.5 - Math.random());
      
      // 1. Heatwave (High Temp)
      const heatwave = shuffledGrid.find(g => g.temp > 28.5 && g.depth === 0);
      if (heatwave) {
        alerts.push({ 
          lat: heatwave.lat, lon: heatwave.lon, type: 'heatwave', severity: 'critical', 
          title: 'Marine Heatwave Detected', 
          msg: `SST reached ${heatwave.temp}°C.`, 
          reason: 'Prolonged high Sea Surface Temperatures can trigger mass coral bleaching events and disrupt fisheries.', 
          ts: new Date().toISOString() 
        });
      }

      // 2. Extreme Current
      const extreme = shuffledGrid.find(g => g.current > 0.8 && g.depth === 0);
      if (extreme) {
        alerts.push({ 
          lat: extreme.lat, lon: extreme.lon, type: 'current', severity: 'critical', 
          title: 'Extreme Current Velocity', 
          msg: `Surface flow reached ${(extreme.current * 100).toFixed(0)} cm/s.`, 
          reason: 'Abnormally fast surface currents indicate intense wind-driven forcing or eddy shedding.', 
          ts: new Date().toISOString() 
        });
      }

      // 3. Algal Bloom based on a randomized BGC or CTD instrument location
      const instruments = [...INSTRUMENTS].sort(() => 0.5 - Math.random());
      const sensor = instruments.find(i => i.type === 'bgc' || i.type === 'ctd');
      if (sensor && Math.random() > 0.3) {
         alerts.push({ 
           lat: sensor.lat, lon: sensor.lon, type: 'bloom', severity: 'warning', 
           title: 'Harmful Algal Bloom', 
           msg: `Chlorophyll-a spike detected by ${sensor.name}.`, 
           reason: 'Excessive phytoplankton growth rapidly depletes water oxygen levels (hypoxia), creating toxic "dead zones".', 
           ts: new Date().toISOString() 
         });
      }
    }
    
    // Deduplicate by type
    const uniqueAlerts = [];
    const seen = new Set();
    alerts.forEach(a => {
      if (!seen.has(a.type)) {
        uniqueAlerts.push(a);
        seen.add(a.type);
      }
    });
    
    return uniqueAlerts;
  }, [userDataset, currentTimeStep]);

  const handleFlyTo = (alert) => {
    setCameraTarget({ lat: alert.lat, lon: alert.lon });
    setCurrentView('globe');
  };

  return (
    <div className="alerts-view">
      <div className="av-header">
        <div className="av-title-row">
          <span className="av-icon">🚨</span>
          <div>
            <h1 className="av-title">Disaster Prediction & Alerts</h1>
            <p className="av-subtitle">Automated early warning system based on ML forecasts</p>
          </div>
        </div>
      </div>

      <div className="alerts-content">
        {activeAlerts.length === 0 ? (
          <div className="alerts-empty safe">
            <div className="alerts-empty-icon">✅</div>
            <h2>All Clear</h2>
            <p>No critical disasters or severe anomalies detected at this time.</p>
            <div className="alerts-meta">
              Current Simulation Step: {currentTimeStep}
            </div>
          </div>
        ) : (
          <div className="alerts-list">
            <div className="alerts-summary">
              <h3>Predicted Disasters ({activeAlerts.length})</h3>
              <p>The prediction engine has flagged the following high-risk events based on the active simulation data:</p>
            </div>
            
            <div className="alerts-grid">
              {activeAlerts.map((alert, idx) => {
                const isCritical = alert.severity === 'critical';
                const icon = alert.type === 'heatwave' ? '🌡️' : alert.type === 'bloom' ? '🦠' : '🌊';
                
                return (
                  <div key={idx} className={`alert-card ${alert.severity}`}>
                    <div className="alert-card-header">
                      <div className="alert-icon">{icon}</div>
                      <div className="alert-title-wrap">
                        <h4>{alert.title}</h4>
                        <span className="alert-time">{new Date(alert.ts).toLocaleString()}</span>
                      </div>
                      <div className="alert-badge">{isCritical ? 'CRITICAL' : 'WARNING'}</div>
                    </div>
                    
                    <div className="alert-card-body">
                      <div className="alert-metric">
                        <strong>Trigger:</strong> {alert.msg}
                      </div>
                      <div className="alert-reason">
                        <strong>Impact Analysis:</strong> {alert.reason}
                      </div>
                    </div>
                    
                    <div className="alert-card-actions">
                      <button className="alert-view-btn" onClick={() => handleFlyTo(alert)}>
                        🌍 Fly to Location (Lat: {alert.lat.toFixed(1)}, Lon: {alert.lon.toFixed(1)})
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
