// frontend/src/module/contador/components/CountingTable.jsx
// Tabla de productos contados en la sesión activa.
// Cuando hasClientDB=true muestra columnas de diferencia en tiempo real.

import { MapPin, Trash2, AlertTriangle } from 'lucide-react';

const DiffCell = ({ cantidad, cantidad_sistema, en_sistema }) => {
  if (cantidad_sistema === null || cantidad_sistema === undefined) {
    return <td style={{padding:'8px', textAlign:'center', color:'#8b949e', fontSize:'0.8rem'}}>—</td>;
  }
  const diff = cantidad - cantidad_sistema;
  const color = diff === 0 ? 'var(--success)' : diff > 0 ? '#f59e0b' : '#ef4444';
  return (
    <td style={{padding:'8px', textAlign:'center', fontWeight:'bold', color, fontFamily:'monospace'}}>
      {diff > 0 ? `+${diff}` : diff}
    </td>
  );
};

const CountingTable = ({
  items, lastScannedId, isDynamic,
  onUpdateQuantity, onDeleteItem, onQuantityKeyDown,
  hasClientDB,
}) => (
  <div style={{flex:1,overflowY:'auto',background:'var(--card)',borderRadius:'12px',border:'1px solid var(--border)'}}>
    <table className="data-table" style={{width:'100%',borderCollapse:'collapse'}}>
      <thead style={{position:'sticky',top:0,background:'var(--card)',zIndex:10}}>
        <tr>
          <th style={{padding:'10px',textAlign:'left',borderBottom:'1px solid var(--border)',color:'#8b949e'}}>Producto / Ubic</th>
          {hasClientDB && (
            <>
              <th style={{padding:'10px',textAlign:'center',borderBottom:'1px solid var(--border)',color:'#8b949e',width:'55px'}}>Sist.</th>
              <th style={{padding:'10px',textAlign:'center',borderBottom:'1px solid var(--border)',color:'#8b949e',width:'55px'}}>Cont.</th>
              <th style={{padding:'10px',textAlign:'center',borderBottom:'1px solid var(--border)',color:'#8b949e',width:'55px'}}>Dif.</th>
            </>
          )}
          {!hasClientDB && (
            <th style={{padding:'10px',textAlign:'center',borderBottom:'1px solid var(--border)',color:'#8b949e',width:'70px'}}>Cant.</th>
          )}
          <th style={{padding:'10px',textAlign:'center',borderBottom:'1px solid var(--border)',color:'#8b949e',width:'40px'}}></th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr
            key={item.id}
            className={item.id === lastScannedId ? 'row-flash' : ''}
            style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}
          >
            <td style={{padding:'10px'}}>
              <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                <span style={{fontFamily:'monospace',fontSize:'1rem',fontWeight:'bold'}}>{item.codigo_producto}</span>
                {hasClientDB && item.en_sistema === false && (
                  <AlertTriangle size={12} color="#f59e0b" title="Producto no encontrado en BD local" />
                )}
              </div>
              {item.descripcion && (
                <div style={{fontSize:'0.75rem', color:'#8b949e', marginTop:'1px'}}>{item.descripcion}</div>
              )}
              {item.ubicacion && isDynamic && (
                <div style={{fontSize:'0.75rem',color:'var(--accent)',display:'flex',alignItems:'center',gap:'4px',marginTop:'2px'}}>
                  <MapPin size={10}/> {item.ubicacion}
                </div>
              )}
            </td>

            {hasClientDB && (
              <>
                {/* Cantidad sistema (solo lectura) */}
                <td style={{padding:'8px',textAlign:'center',color:'#8b949e',fontFamily:'monospace'}}>
                  {item.cantidad_sistema ?? '—'}
                </td>
                {/* Cantidad contada (editable) */}
                <td style={{padding:'8px',textAlign:'center'}}>
                  <input
                    type="number"
                    min="0"
                    value={item.cantidad}
                    onChange={e => onUpdateQuantity(item.id, e.target.value)}
                    onKeyDown={onQuantityKeyDown}
                    onFocus={e => e.target.select()}
                    className="qty-input"
                    style={{width:'50px'}}
                  />
                </td>
                {/* Diferencia */}
                <DiffCell
                  cantidad={item.cantidad}
                  cantidad_sistema={item.cantidad_sistema}
                  en_sistema={item.en_sistema}
                />
              </>
            )}

            {!hasClientDB && (
              <td style={{padding:'8px',textAlign:'center'}}>
                <input
                  type="number"
                  min="0"
                  value={item.cantidad}
                  onChange={e => onUpdateQuantity(item.id, e.target.value)}
                  onKeyDown={onQuantityKeyDown}
                  onFocus={e => e.target.select()}
                  className="qty-input"
                />
              </td>
            )}

            <td style={{padding:'8px',textAlign:'center'}}>
              <button className="delete-btn" onClick={() => onDeleteItem(item.id)} title="Eliminar registro" type="button">
                <Trash2 size={14} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default CountingTable;
