// frontend/src/module/contador/components/ScanFeedback.jsx
// Banner temporal que confirma el último escaneo procesado.
// Se muestra/oculta con transición CSS según si feedback es null o no.

const ScanFeedback = ({ feedback }) => (
  <div className={`scan-feedback ${feedback ? 'visible' : ''}`}>
    {feedback && (
      <>
        <span style={{fontFamily:'monospace',fontWeight:'bold'}}>{feedback.codigo}</span>
        <span style={{color: feedback.isNew ? 'var(--success, #22c55e)' : 'var(--accent2)'}}>
          {feedback.isNew ? ` ✓ NUEVO (+${feedback.qty})` : ` +${feedback.qty}`}
        </span>
      </>
    )}
  </div>
);

export default ScanFeedback;
