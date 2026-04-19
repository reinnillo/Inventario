// frontend/src/module/contador/hooks/useCounterSync.js
// Gestiona el proceso de sincronización chunkeada con el servidor
// y el seguimiento de progreso. No conoce el historial directamente;
// notifica el resultado vía callback onSyncSuccess para mantener el desacoplamiento.
//
// Parámetros:
//   sessionData    — datos de la sesión activa (inicio, marbete, área, esRecuento, etc.)
//   user           — objeto de usuario autenticado (id, cliente_id, nombre)
//   toast          — instancia del sistema de notificaciones
//   scanInputRef   — para devolver el foco tras el sync
//   locInputRef    — ídem en modo dinámico
//   onSyncSuccess  — callback(historyEntry) invocado tras sync exitoso

import { useState } from 'react';
import { db, resetCountingSession } from '../../../db/db';
import { API_URL } from '../../../config/api';
import { SYNC_CHUNK_SIZE } from '../constants';

/**
 * @param {{ sessionData, user, toast, scanInputRef, locInputRef, onSyncSuccess }}
 * @returns {{ isSyncing, syncProgress, syncData }}
 */
const useCounterSync = ({ sessionData, user, toast, scanInputRef, locInputRef, onSyncSuccess }) => {
  const [isSyncing,    setIsSyncing]    = useState(false);
  const [syncProgress, setSyncProgress] = useState(null); // { done, total } | null

  /**
   * @param {{ allItems: object[] }} params
   */
  const syncData = async ({ allItems }) => {
    if (allItems.length === 0) return;

    // Validar identidad del usuario antes de enviar
    if (!user?.id || !user?.cliente_id) {
      toast.error('No se puede sincronizar: sesión de usuario inválida.');
      return;
    }

    setIsSyncing(true);

    // Deserializar fecha de inicio (viene como string desde localStorage)
    const fechaInicio  = sessionData.inicio ? new Date(sessionData.inicio) : new Date();
    const totalPiezas  = allItems.reduce((acc, i) => acc + i.cantidad, 0);
    const totalItems   = allItems.length;

    setSyncProgress({ done: 0, total: totalItems });

    try {
      let processed = 0;

      for (let i = 0; i < totalItems; i += SYNC_CHUNK_SIZE) {
        const chunk = allItems.slice(i, i + SYNC_CHUNK_SIZE);
        const payload = chunk.map(item => ({
          cliente_id:            user.cliente_id,
          area:                  item.area     || sessionData.area,
          ubicacion:             item.ubicacion || sessionData.ubicacion,
          marbete:               item.marbete,
          codigo_producto:       item.codigo_producto,
          cantidad:              item.cantidad,
          cantidad_sistema:      item.cantidad_sistema  ?? null,
          descripcion:           item.descripcion       || null,
          diferencia:            item.cantidad_sistema != null
                                   ? item.cantidad - item.cantidad_sistema
                                   : null,
          fecha_escaneo:         item.fecha_escaneo,
          contador_id:           user.id,
          nombre_contador:       user.nombre,
          fecha_inicio_marbete:  fechaInicio,
          fecha_fin_marbete:     new Date(),
          es_recuento:           sessionData.esRecuento ?? false,
        }));

        const res = await fetch(`${API_URL}/api/conteos/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: payload }),
        });

        if (!res.ok) throw new Error('Error servidor');
        processed += chunk.length;
        setSyncProgress({ done: processed, total: totalItems });
      }

      // Notificar al orquestador para que guarde en historial
      onSyncSuccess({
        marbete:    sessionData.marbete,
        area:       sessionData.area,
        ubicacion:  sessionData.ubicacion,
        isDynamic:  sessionData.isDynamic,
        esRecuento: sessionData.esRecuento,
        registros:  processed,
        piezas:     totalPiezas,
        fecha:      new Date().toISOString(),
      });

      toast.success(`✅ Sincronizados ${processed} registros.`);
      await resetCountingSession();

    } catch (err) {
      toast.error('❌ Error Sync: ' + err.message);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
      if (sessionData.isDynamic) locInputRef.current?.focus();
      else scanInputRef.current?.focus();
    }
  };

  return { isSyncing, syncProgress, syncData };
};

export default useCounterSync;
