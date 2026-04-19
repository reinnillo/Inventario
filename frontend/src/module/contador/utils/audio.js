// frontend/src/module/contador/utils/audio.js
// Utilidades de audio. Sin dependencias de React.

/**
 * Emite un beep corto de confirmación mediante Web Audio API.
 * Falla silenciosamente si el navegador no soporta la API o el usuario
 * no ha interactuado aún con la página (política de autoplay).
 */
export const playBeep = () => {
  try {
    const AudioCtx = window.AudioContext || window['webkitAudioContext'];
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (_) {}
};
