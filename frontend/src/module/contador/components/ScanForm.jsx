// frontend/src/module/contador/components/ScanForm.jsx
// Formulario de escaneo dual: input de ubicación (modo dinámico) + producto + cantidad previa.
// Los refs se crean en el orquestador y se pasan como props.

import { MapPin, Box, ArrowRight } from 'lucide-react';

const ScanForm = ({
  sessionData,
  scanInput,    setScanInput,
  dynamicLocInput, setDynamicLocInput,
  preQty,       setPreQty,
  isSyncing,
  onSubmit,
  onLocKeyDown,
  scanInputRef,
  locInputRef,
  preQtyRef,
}) => (
  <form onSubmit={onSubmit} style={{marginBottom:'10px',display:'flex',flexDirection:'column',gap:'10px'}}>

    {sessionData.isDynamic && (
      <div style={{position:'relative'}}>
        <MapPin size={18} style={{position:'absolute',top:15,left:15,color:'var(--accent2)'}} />
        <input
          ref={locInputRef}
          className="pda-input"
          style={{paddingLeft:'45px',borderColor: dynamicLocInput ? 'var(--success, #22c55e)' : 'var(--border)'}}
          placeholder="Escanear Ubicación..."
          value={dynamicLocInput}
          onChange={e => setDynamicLocInput(e.target.value)}
          onKeyDown={onLocKeyDown}
          disabled={isSyncing}
        />
      </div>
    )}

    <div style={{display:'flex',gap:'10px'}}>
      <input
        ref={preQtyRef}
        type="number"
        min="1"
        max="9999"
        value={preQty}
        onChange={e => setPreQty(e.target.value)}
        onFocus={e => e.target.select()}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); scanInputRef.current?.focus(); }}}
        className="qty-input pre-qty-input"
        title="Cantidad a registrar"
        disabled={isSyncing}
      />
      <div style={{position:'relative',flex:1}}>
        <Box size={18} style={{position:'absolute',top:15,left:15,color: sessionData.isDynamic ? '#8b949e' : 'var(--accent2)'}} />
        <input
          ref={scanInputRef}
          className="pda-input"
          style={{paddingLeft:'45px',border:'2px solid var(--accent2)',fontSize:'1.1rem',fontWeight:'bold'}}
          placeholder="Escanear Producto..."
          value={scanInput}
          onChange={e => setScanInput(e.target.value)}
          disabled={isSyncing}
          autoFocus={!sessionData.isDynamic}
        />
      </div>
      <button type="submit" style={{width:'50px',background:'var(--accent2)',border:'none',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',color:'white',flexShrink:0}}>
        <ArrowRight />
      </button>
    </div>
  </form>
);

export default ScanForm;
