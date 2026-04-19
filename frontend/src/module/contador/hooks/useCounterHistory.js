// frontend/src/module/contador/hooks/useCounterHistory.js
// Gestiona el historial local de lotes enviados y el flujo de recuento.
//
// Parámetros:
//   setSessionData — setter del orquestador para pre-llenar el form al recontar

import { useState, useEffect } from 'react';
import { decodeSession, appendHistory } from '../utils/sessionStorage';
import { HISTORY_KEY } from '../constants';

/**
 * @param {{ setSessionData: Function }}
 * @returns {{
 *   syncHistory, showHistory, setShowHistory,
 *   addToHistory,
 *   handleRecontar,
 * }}
 */
const useCounterHistory = ({ setSessionData }) => {
  const [syncHistory,  setSyncHistory]  = useState([]);
  const [showHistory,  setShowHistory]  = useState(false);

  // Cargar historial al montar
  useEffect(() => {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) setSyncHistory(decodeSession(raw) || []);
  }, []);

  /**
   * Agrega una entrada al historial y actualiza el estado.
   * Llamado desde el orquestador vía onSyncSuccess.
   * @param {object} entry
   */
  const addToHistory = (entry) => {
    const updated = appendHistory(entry);
    setSyncHistory(updated);
  };

  /**
   * Pre-llena el formulario de setup con los datos de un lote anterior
   * y activa el modo recuento automáticamente.
   * @param {object} entry
   */
  const handleRecontar = (entry) => {
    setSessionData({
      area:       entry.area,
      ubicacion:  entry.ubicacion  || '',
      marbete:    entry.marbete,
      isDynamic:  entry.isDynamic  || false,
      esRecuento: true,
    });
    setShowHistory(false);
  };

  return { syncHistory, showHistory, setShowHistory, addToHistory, handleRecontar };
};

export default useCounterHistory;
