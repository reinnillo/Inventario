// frontend/src/module/contador/components/ConfirmModal.jsx
// Modal de confirmación genérico. Solo props, sin lógica de negocio.
// Candidato a moverse a components/Shared/ si otros módulos lo necesitan.

const ConfirmModal = ({ title, message, onConfirm, onCancel }) => (
  <div style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(0,0,0,0.8)',zIndex:9999,display:'flex',justifyContent:'center',alignItems:'center',padding:'20px'}}>
    <div className="pda-card" style={{width:'100%',maxWidth:'400px',border:'1px solid var(--accent2)'}}>
      <h3 style={{marginTop:0,color:'var(--fg)'}}>{title}</h3>
      <p style={{color:'#8b949e',fontSize:'1.1rem',lineHeight:'1.5',marginBottom:'20px'}}>{message}</p>
      <div className="grid-row">
        <button onClick={onCancel}  className="pda-btn-secondary" style={{background:'#1f2937'}}>Cancelar</button>
        <button onClick={onConfirm} className="pda-btn-primary">Confirmar</button>
      </div>
    </div>
  </div>
);

export default ConfirmModal;
