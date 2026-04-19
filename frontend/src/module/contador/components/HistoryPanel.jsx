// frontend/src/module/contador/components/HistoryPanel.jsx
// Panel colapsable con el historial de lotes enviados y el botón Recontar.

import { History, RefreshCw } from 'lucide-react';

const HistoryPanel = ({ history, showHistory, onToggle, onRecontar }) => {
  if (history.length === 0) return null;

  return (
    <div style={{marginTop:'20px'}}>
      <button
        type="button"
        onClick={onToggle}
        style={{background:'transparent',border:'none',color:'#8b949e',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',fontSize:'0.85rem',padding:'8px 0',width:'100%'}}
      >
        <History size={14} />
        {showHistory ? 'Ocultar' : 'Ver'} historial de lotes enviados ({history.length})
      </button>

      {showHistory && (
        <div className="pda-card" style={{padding:'10px',marginTop:'8px'}}>
          {history.map((entry, idx) => (
            <div key={idx} className="history-row">
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:'bold',fontSize:'0.9rem',color:'var(--fg)',display:'flex',alignItems:'center',gap:'6px'}}>
                  M: {entry.marbete}
                  {entry.esRecuento && (
                    <span style={{fontSize:'0.6rem',background:'#7c3aed',color:'#fff',borderRadius:'3px',padding:'1px 5px'}}>RC</span>
                  )}
                </div>
                <div style={{fontSize:'0.75rem',color:'#8b949e'}}>
                  {entry.area} · {entry.registros} reg. · {entry.piezas} pzas.
                </div>
                <div style={{fontSize:'0.7rem',color:'#6b7280'}}>
                  {new Date(entry.fecha).toLocaleString()}
                </div>
              </div>
              <button type="button" className="recontar-btn" onClick={() => onRecontar(entry)} title="Pre-llenar form para recontar">
                <RefreshCw size={13} /> Recontar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
