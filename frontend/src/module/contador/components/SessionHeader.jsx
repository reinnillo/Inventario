// frontend/src/module/contador/components/SessionHeader.jsx
// Cabecera de la sesión activa: marbete, área, indicador de red y estadísticas.

import { Wifi, WifiOff } from 'lucide-react';

const SessionHeader = ({ marbete, area, ubicacion, isDynamic, esRecuento, isOnline, totalRegistros, totalPiezas }) => (
  <div className="pda-header">
    <div className="header-top" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <div>
        <h3 style={{margin:0,color:'var(--accent2)'}}>
          M: {marbete}
          {esRecuento && (
            <span style={{fontSize:'0.65rem',background:'#7c3aed',color:'#fff',borderRadius:'4px',padding:'2px 6px',marginLeft:'8px',verticalAlign:'middle'}}>
              RECUENTO
            </span>
          )}
        </h3>
        <small style={{color:'#8b949e'}}>
          {area} {isDynamic ? '(Dinámico)' : ubicacion}
        </small>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'0.7rem',color: isOnline ? 'var(--success, #22c55e)' : '#8b949e'}}>
        {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
        {isOnline ? 'ONLINE' : 'OFFLINE'}
      </div>
    </div>
    <div className="header-stats">
      <div style={{textAlign:'left'}}>
        <div style={{fontSize:'0.7rem',color:'#8b949e'}}>REGISTROS</div>
        <div style={{fontSize:'1.1rem',fontWeight:'bold'}}>{totalRegistros}</div>
      </div>
      <div style={{textAlign:'right'}}>
        <div style={{fontSize:'0.7rem',color:'#8b949e'}}>TOTAL PIEZAS</div>
        <div style={{fontSize:'1.5rem',fontWeight:'bold',color:'var(--fg)'}}>{totalPiezas}</div>
      </div>
    </div>
  </div>
);

export default SessionHeader;
