// frontend/src/module/contador/components/SetupView.jsx
// Vista de configuración inicial del lote: BD local, formulario + historial de lotes.

import { Scan, MapPin, Database, CloudDownload, Loader2, AlertTriangle } from 'lucide-react';
import HistoryPanel from './HistoryPanel';

const SetupView = ({
  sessionData, setSessionData, onStart,
  syncHistory, showHistory, setShowHistory, onRecontar,
  localDbCount, isDownloading, onDownloadDB,
}) => (
  <div className="dashboard-container animate-fade-in" style={{maxWidth:'600px',margin:'0 auto'}}>
    <div style={{textAlign:'center',marginBottom:'30px'}}>
      <Scan size={64} color="var(--accent2)" />
      <h2 style={{color:'var(--accent2)'}}>Estación de Conteo</h2>
      <p style={{color:'#8b949e'}}>Configuración de Lote</p>
    </div>

    {/* Tarjeta BD Local */}
    <div className="pda-card" style={{marginBottom:'20px', borderColor: localDbCount > 0 ? 'var(--accent2)' : 'var(--border)'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
        <h4 style={{margin:0, color: localDbCount > 0 ? 'var(--accent2)' : '#8b949e', display:'flex', alignItems:'center', gap:'8px'}}>
          <Database size={16} /> BD Local del Cliente
        </h4>
        <span style={{fontSize:'0.8rem', color: localDbCount > 0 ? 'var(--fg)' : '#f59e0b', display:'flex', alignItems:'center', gap:'4px'}}>
          {localDbCount === 0 && <AlertTriangle size={12} />}
          {localDbCount > 0 ? `${localDbCount.toLocaleString()} productos` : 'Sin datos'}
        </span>
      </div>
      <button
        type="button"
        onClick={onDownloadDB}
        disabled={isDownloading}
        style={{
          width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid var(--accent2)',
          background:'transparent', color:'var(--accent2)', fontWeight:'bold',
          cursor: isDownloading ? 'not-allowed' : 'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
          opacity: isDownloading ? 0.6 : 1,
        }}
      >
        {isDownloading
          ? <><Loader2 size={16} className="animate-spin" /> Descargando...</>
          : <><CloudDownload size={16} /> {localDbCount > 0 ? 'Actualizar BD' : 'Descargar BD'}</>
        }
      </button>
      {localDbCount === 0 && (
        <p style={{margin:'8px 0 0 0', fontSize:'0.75rem', color:'#f59e0b', textAlign:'center'}}>
          Sin BD local no se mostrarán diferencias en tiempo real.
        </p>
      )}
    </div>

    <form onSubmit={onStart} className="pda-card">
      {/* Toggle: Ubicación Dinámica */}
      <div
        className={`switch-container ${sessionData.isDynamic ? 'active' : ''}`}
        onClick={() => setSessionData(prev => ({...prev, isDynamic: !prev.isDynamic, ubicacion: ''}))}
      >
        <div>
          <div style={{fontWeight:'bold',color:'var(--fg)',display:'flex',alignItems:'center',gap:'8px'}}>
            <MapPin size={16} /> Ubicación Dinámica (1:1)
          </div>
          <div style={{fontSize:'0.8rem',color:'#8b949e'}}>
            Activar si la ubicación cambia con cada producto.
          </div>
        </div>
        <div className="toggle"></div>
      </div>

      <input
        className="pda-input"
        placeholder="Área / Zona General"
        value={sessionData.area}
        onChange={e => setSessionData({...sessionData, area: e.target.value})}
        required
        style={{marginBottom:'15px'}}
      />

      {!sessionData.isDynamic && (
        <input
          className="pda-input"
          placeholder="Ubicación Fija (Opcional)"
          value={sessionData.ubicacion}
          onChange={e => setSessionData({...sessionData, ubicacion: e.target.value})}
          style={{marginBottom:'15px'}}
        />
      )}

      <input
        className="pda-input"
        placeholder="N° Marbete (Control)"
        value={sessionData.marbete}
        onChange={e => setSessionData({...sessionData, marbete: e.target.value})}
        required
        style={{marginBottom:'15px'}}
      />

      {/* Toggle: Marcar como Recuento */}
      <div
        className={`switch-container ${sessionData.esRecuento ? 'active' : ''}`}
        onClick={() => setSessionData(prev => ({...prev, esRecuento: !prev.esRecuento}))}
        style={{marginBottom:'20px'}}
      >
        <div>
          <div style={{fontWeight:'bold',color:'var(--fg)',fontSize:'0.9rem'}}>Marcar como Recuento</div>
          <div style={{fontSize:'0.8rem',color:'#8b949e'}}>Activa si es un segundo conteo de verificación.</div>
        </div>
        <div className="toggle"></div>
      </div>

      <button type="submit" className="pda-btn-primary">
        INICIAR {sessionData.isDynamic ? 'FLUJO DINÁMICO' : sessionData.esRecuento ? 'RECUENTO' : 'LOTE'}
      </button>
    </form>

    <HistoryPanel
      history={syncHistory}
      showHistory={showHistory}
      onToggle={() => setShowHistory(h => !h)}
      onRecontar={onRecontar}
    />
  </div>
);

export default SetupView;
