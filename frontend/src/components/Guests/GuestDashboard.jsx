// frontend/src/components/Guests/GuestDashboard.jsx
import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, Activity, BarChart2, Clock, 
  AlertTriangle, CheckCircle, RefreshCw, Lock, Globe 
} from "lucide-react";
import { API_URL } from "../../config/api.js";

// Estilos inline para asegurar aislamiento total
const containerStyle = {
  minHeight: '100vh',
  background: '#0d1117',
  color: '#e6edf3',
  fontFamily: "'Segoe UI', sans-serif",
  padding: '20px',
  boxSizing: 'border-box'
};

const cardStyle = {
  background: '#161b22',
  border: '1px solid #30363d',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
};

const GuestDashboard = ({ token }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auto-refresh
  const fetchGuestData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/guest/access?token=${token}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Acceso denegado");
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuestData();
    const interval = setInterval(fetchGuestData, 60000);
    return () => clearInterval(interval);
  }, [token]);

  // --- ESTILOS CSS RESPONSIVOS (Inyectados) ---
  const cssStyles = `
    /* RESET & BASE */
    .guest-wrapper {
      min-height: 100vh;
      background: #0d1117;
      color: #e6edf3;
      font-family: 'Segoe UI', sans-serif;
      padding: 20px;
      box-sizing: border-box;
    }
    
    .guest-card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }

    /* HEADER RESPONSIVO */
    .guest-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid #30363d;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .header-right {
      text-align: right;
      font-size: 0.8rem;
      color: #8b949e;
    }

    /* LAYOUT PRINCIPAL */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 3fr 1fr; /* Desktop: 3 a 1 */
      gap: 25px;
    }

    .left-col { display: flex; flex-direction: column; gap: 25px; }
    .right-col { display: flex; flex-direction: column; gap: 25px; }

    /* KPI GRID */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr); /* Desktop: 4 columnas */
      gap: 15px;
    }

    /* TIMELINE */
    .timeline-item {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding-bottom: 15px;
      border-bottom: 1px dashed #30363d;
    }
    .timeline-item:last-child { border-bottom: none; }
    
    .big-stat {
        font-size: 2rem;
        font-weight: bold;
    }

    /* --- MEDIA QUERIES (MÓVIL) --- */
    @media (max-width: 1024px) {
      .dashboard-grid {
        grid-template-columns: 1fr; /* Tablet: Una sola columna apilada */
      }
      .right-col {
        flex-direction: row; /* Poner timeline y footer lado a lado si cabe */
      }
    }

    @media (max-width: 768px) {
      .guest-wrapper { padding: 15px; }
      
      .guest-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 15px;
      }
      
      .header-right {
        text-align: left;
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid #30363d;
        padding-top: 10px;
      }

      .kpi-grid {
        grid-template-columns: 1fr 1fr; /* Móvil: 2 columnas (2x2) */
      }

      .right-col {
        flex-direction: column; /* Móvil: Todo vertical */
      }
    }

    @media (max-width: 480px) {
      .kpi-grid {
        grid-template-columns: 1fr; /* Móvil Pequeño: 1 columna vertical */
      }
      
      .guest-card { padding: 15px; }
      
      h2 { font-size: 1.1rem; }
      .big-stat { font-size: 1.8rem !important; }
    }
  `;

  // --- RENDERIZADO DE ESTADOS ---

  if (loading && !data) {
    return (
      <div className="guest-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <style>{cssStyles}</style>
        <div className="animate-spin" style={{ marginBottom: '20px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #00e0ff', borderRadius: '50%', width: '40px', height: '40px' }}></div>
        <p style={{ color: '#8b949e' }}>Estableciendo conexión segura...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="guest-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{cssStyles}</style>
        <div className="guest-card" style={{ maxWidth: '400px', textAlign: 'center', borderColor: '#ef4444' }}>
          <Lock size={48} color="#ef4444" style={{ marginBottom: '20px', margin: '0 auto' }} />
          <h2 style={{ color: '#ef4444', marginTop: 0 }}>Acceso Restringido</h2>
          <p style={{ color: '#8b949e' }}>{error}</p>
          <div style={{ marginTop: '20px', fontSize: '0.8rem', opacity: 0.5 }}>Portal de Auditoría</div>
        </div>
      </div>
    );
  }

  return (
    <div className="guest-wrapper">
      <style>{cssStyles}</style>

      {/* NAVBAR */}
      <div className="guest-header">
        <div className="header-left">
            <div style={{ width: '45px', height: '45px', background: 'var(--accent)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldCheck color="#000" size={24} />
            </div>
            <div>
                <h2 style={{ margin: 0, color: '#e6edf3' }}>reinnillo Live View</h2>
                <div style={{ fontSize: '0.85rem', color: '#8b949e' }}>
                    Cliente: <strong style={{ color: 'var(--accent)' }}>{data.client.name}</strong>
                </div>
            </div>
        </div>
        <div className="header-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'block' }}></span>
                <span style={{ fontWeight: 'bold', color: '#10b981' }}>ONLINE</span>
            </div>
            <div>
                Act: {new Date(data.lastUpdate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
        </div>
      </div>

      {/* DASHBOARD GRID */}
      <div className="dashboard-grid">
        
        {/* COLUMNA IZQUIERDA: MÉTRICAS */}
        <div className="left-col">
            
            {/* KPI ROW */}
            <div className="kpi-grid">
                <div className="guest-card">
                    <div style={{ fontSize: '0.75rem', color: '#8b949e', marginBottom: '5px', textTransform:'uppercase' }}>Precisión (ERI)</div>
                    <div className="big-stat" style={{ color: data.kpis.accuracy > 95 ? '#10b981' : '#f59e0b' }}>
                        {data.kpis.accuracy}%
                    </div>
                </div>
                <div className="guest-card">
                    <div style={{ fontSize: '0.75rem', color: '#8b949e', marginBottom: '5px', textTransform:'uppercase' }}>Auditado (Und)</div>
                    <div className="big-stat" style={{ color: '#e6edf3' }}>
                        {data.kpis.totalPhysical.toLocaleString()}
                    </div>
                </div>
                <div className="guest-card" style={{ borderColor: data.kpis.netVariance === 0 ? '#30363d' : (data.kpis.netVariance < 0 ? '#ef4444' : '#10b981') }}>
                    <div style={{ fontSize: '0.75rem', color: '#8b949e', marginBottom: '5px', textTransform:'uppercase' }}>Varianza Neta</div>
                    <div className="big-stat" style={{ color: data.kpis.netVariance === 0 ? '#e6edf3' : (data.kpis.netVariance < 0 ? '#ef4444' : '#10b981') }}>
                        {data.kpis.netVariance > 0 ? '+' : ''}{data.kpis.netVariance}
                    </div>
                </div>
                <div className="guest-card">
                    <div style={{ fontSize: '0.75rem', color: '#8b949e', marginBottom: '5px', textTransform:'uppercase' }}>Progreso Global</div>
                    <div className="big-stat" style={{ color: '#3b82f6' }}>
                        {data.kpis.progress}%
                    </div>
                </div>
            </div>

            {/* PERFORMANCE POR ÁREA */}
            <div className="guest-card">
                <h3 style={{ margin: '0 0 20px 0', color: '#e6edf3', display: 'flex', alignItems: 'center', gap: '10px', fontSize:'1.1rem' }}>
                    <Globe size={20} color="#8b949e" /> Rendimiento por Zonas
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {data.areas.map((area, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ width: '120px', fontSize: '0.9rem', color: '#8b949e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{area.name}</div>
                            <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ 
                                    width: `${area.accuracy}%`, height: '100%', 
                                    background: area.accuracy > 95 ? '#10b981' : area.accuracy > 80 ? '#f59e0b' : '#ef4444' 
                                }}></div>
                            </div>
                            <div style={{ width: '40px', textAlign: 'right', fontWeight: 'bold', fontSize: '0.9rem' }}>{area.accuracy}%</div>
                        </div>
                    ))}
                    {data.areas.length === 0 && <div style={{ color: '#8b949e', fontStyle: 'italic', textAlign: 'center' }}>Sin datos zonales disponibles.</div>}
                </div>
            </div>

        </div>

        {/* COLUMNA DERECHA: TIMELINE */}
        <div className="right-col">
            
            {/* LIVE FEED */}
            <div className="guest-card" style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '10px', fontSize:'1.1rem' }}>
                    <Activity size={20} /> Actividad
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {data.timeline.map((event, i) => (
                        <div key={i} className="timeline-item">
                            <div style={{ marginTop: '6px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#30363d', border: '2px solid #8b949e' }}></div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.9rem', color: '#e6edf3', fontWeight:'500' }}>{event.accion}</div>
                                <div style={{ fontSize: '0.75rem', color: '#8b949e', marginTop:'2px' }}>
                                    {new Date(event.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • <span style={{ textTransform: 'uppercase', color: event.estado === 'verificado' ? '#10b981' : '#f59e0b' }}>{event.estado}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {data.timeline.length === 0 && <div style={{ color: '#8b949e', textAlign: 'center', padding: '20px' }}>Esperando actividad en tiempo real...</div>}
                </div>
            </div>

            {/* INFO FOOTER */}
            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#8b949e', opacity: 0.6, padding: '10px' }}>
                <p style={{margin:'5px 0'}}>Acceso de Invitado • Solo Lectura</p>
                <p style={{margin:0}}>Token válido hasta: {new Date(data.access.validUntil).toLocaleDateString()}</p>
            </div>

        </div>

      </div>
    </div>
  );
};

export default GuestDashboard;