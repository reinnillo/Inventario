// frontend/src/module/contador/hooks/useCounterSession.js
// Gestiona el ciclo de vida de la sesión de conteo:
// inicio, cierre, persistencia en localStorage y re-hidratación al volver a la pestaña.
//
// Parámetros:
//   scanInputRef  — ref del input de producto (para foco post-inicio)
//   locInputRef   — ref del input de ubicación dinámica (para foco en modo dinámico)
//   onNeedConfirm — callback(title, message, onConfirm) para mostrar el modal de confirmación
//
// NOTA: closeSession recibe itemsCount como parámetro para no depender de Dexie directamente.
//       El orquestador le pasa allItems.length.

import { useState, useEffect } from 'react';
import { encodeSession, decodeSession } from '../utils/sessionStorage';
import { SESSION_KEY } from '../constants';

const EMPTY_SESSION = { area: '', ubicacion: '', marbete: '', isDynamic: false, esRecuento: false };

/**
 * @param {{ scanInputRef, locInputRef, onNeedConfirm }}
 * @returns {{ sessionActive, sessionData, setSessionData, startSession, closeSession }}
 */
const useCounterSession = ({ scanInputRef, locInputRef, onNeedConfirm }) => {
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionData, setSessionData] = useState(EMPTY_SESSION);

  // Restaurar sesión al montar (recarga de página)
  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      const parsed = decodeSession(saved);
      if (parsed) { setSessionData(parsed); setSessionActive(true); }
    }
  }, []);

  // Re-hidratar al volver a la pestaña (el navegador móvil puede descartar el estado)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const saved = localStorage.getItem(SESSION_KEY);
        if (saved && !sessionActive) {
          const parsed = decodeSession(saved);
          if (parsed) { setSessionData(parsed); setSessionActive(true); }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [sessionActive]);

  const startSession = (e) => {
    e.preventDefault();
    if (!sessionData.area || !sessionData.marbete) return;
    setSessionActive(true);
    localStorage.setItem(SESSION_KEY, encodeSession({ ...sessionData, inicio: new Date() }));
    setTimeout(() => {
      if (sessionData.isDynamic) locInputRef.current?.focus();
      else scanInputRef.current?.focus();
    }, 100);
  };

  // itemsCount: allItems.length, pasado desde el orquestador
  const closeSession = (itemsCount) => {
    const reset = () => {
      localStorage.removeItem(SESSION_KEY);
      setSessionActive(false);
      setSessionData(EMPTY_SESSION);
    };
    if (itemsCount > 0) {
      onNeedConfirm('Datos Pendientes', 'Hay datos sin sincronizar. ¿Salir y borrar?', reset);
    } else {
      reset();
    }
  };

  return { sessionActive, sessionData, setSessionData, startSession, closeSession };
};

export default useCounterSession;
