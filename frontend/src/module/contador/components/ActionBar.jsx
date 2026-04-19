// frontend/src/module/contador/components/ActionBar.jsx
// Fila de botones Salir / Enviar + barra de progreso del sync.

import { RotateCcw, Send, Loader2 } from 'lucide-react';

const ActionBar = ({ totalItems, isSyncing, syncProgress, onSync, onClose }) => (
  <>
    <div className="grid-row" style={{marginTop:'15px'}}>
      <button onClick={onClose} disabled={isSyncing} className="pda-btn-secondary">
        <RotateCcw size={20} /> Salir
      </button>
      <button onClick={onSync} className="pda-btn-primary" disabled={totalItems === 0 || isSyncing}>
        {isSyncing ? <Loader2 className="animate-spin" /> : <Send size={20} />}
        {isSyncing && syncProgress
          ? ` ${syncProgress.done}/${syncProgress.total}`
          : totalItems > 0 ? ` ENVIAR (${totalItems})` : ' VACÍO'
        }
      </button>
    </div>

    {isSyncing && syncProgress && (
      <div className="sync-progress-wrap">
        <div
          className="sync-progress-fill"
          style={{width: `${Math.round((syncProgress.done / syncProgress.total) * 100)}%`}}
        />
      </div>
    )}
  </>
);

export default ActionBar;
