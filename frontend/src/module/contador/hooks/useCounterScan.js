// frontend/src/module/contador/hooks/useCounterScan.js
// Gestiona todo el flujo de escaneo: validación, escritura en Dexie,
// feedback visual/sonoro y gestión de foco post-scan.
//
// Parámetros:
//   sessionData    — datos de la sesión activa (área, marbete, isDynamic, ubicacion)
//   allItemsCount  — allItems.length (pasado desde el orquestador, sin leer Dexie aquí)
//   scanInputRef   — ref del input de producto
//   locInputRef    — ref del input de ubicación dinámica
//   toast          — instancia del sistema de notificaciones

import { useState, useEffect } from 'react';
import { db } from '../../../db/db';
import { playBeep } from '../utils/audio';
import { validateCodigo } from '../utils/validation';
import { BATCH_LIMIT_MAX } from '../constants';

/**
 * @param {{ sessionData, allItemsCount, scanInputRef, locInputRef, toast }}
 * @returns {{
 *   scanInput, setScanInput,
 *   dynamicLocInput, setDynamicLocInput,
 *   preQty, setPreQty,
 *   lastScannedId,
 *   lastScanFeedback,
 *   handleScanSubmit,
 *   handleLocKeyDown,
 *   handleUpdateQuantity,
 *   handleDeleteItem,
 *   handleQuantityKeyDown,
 * }}
 */
const useCounterScan = ({ sessionData, allItemsCount, scanInputRef, locInputRef, toast }) => {
  const [scanInput,        setScanInput]        = useState('');
  const [dynamicLocInput,  setDynamicLocInput]  = useState('');
  const [preQty,           setPreQty]           = useState(1);
  const [lastScannedId,    setLastScannedId]    = useState(null);
  const [lastScanFeedback, setLastScanFeedback] = useState(null);

  // Auto-limpiar banner de feedback tras 2s
  useEffect(() => {
    if (!lastScanFeedback) return;
    const t = setTimeout(() => setLastScanFeedback(null), 2000);
    return () => clearTimeout(t);
  }, [lastScanFeedback]);

  // Auto-limpiar flash de fila tras 600ms
  useEffect(() => {
    if (!lastScannedId) return;
    const t = setTimeout(() => setLastScannedId(null), 600);
    return () => clearTimeout(t);
  }, [lastScannedId]);

  const handleLocKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (dynamicLocInput.trim()) scanInputRef.current?.focus();
    }
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    if (sessionData.isDynamic && !dynamicLocInput.trim()) {
      toast.warning('Debe ingresar una ubicación primero.');
      locInputRef.current?.focus();
      return;
    }

    const codigo = scanInput.trim();
    const { valid, reason } = validateCodigo(codigo);
    if (!valid) {
      toast.warning(reason);
      setScanInput('');
      scanInputRef.current?.focus();
      return;
    }

    const effectiveLoc = sessionData.isDynamic ? dynamicLocInput.trim() : sessionData.ubicacion;
    const qty = Math.max(1, parseInt(preQty) || 1);

    if (allItemsCount >= BATCH_LIMIT_MAX) {
      toast.error('⛔ Límite de lote alcanzado.');
      return;
    }

    try {
      // Enriquecimiento: buscar producto en BD local del cliente
      const clientProduct = await db.client_products
        .get({ codigo_producto: codigo });
      const cantidad_sistema = clientProduct ? (clientProduct.cantidad ?? null) : null;
      const descripcion      = clientProduct ? (clientProduct.descripcion || '') : '';
      const en_sistema       = !!clientProduct;

      const existing = await db.counting_session
        .where({ codigo_producto: codigo })
        .filter(i => i.ubicacion === effectiveLoc)
        .first();

      if (existing) {
        await db.counting_session.update(existing.id, {
          cantidad: existing.cantidad + qty,
          updatedAt: new Date(),
          // Actualizar datos de sistema por si la BD se refrescó
          cantidad_sistema,
          descripcion,
          en_sistema,
        });
        setLastScannedId(existing.id);
        setLastScanFeedback({ codigo, qty, isNew: false, en_sistema });
      } else {
        const newId = await db.counting_session.add({
          codigo_producto: codigo,
          cantidad: qty,
          fecha_escaneo: new Date(),
          marbete: sessionData.marbete,
          area: sessionData.area,
          ubicacion: effectiveLoc,
          estado: 'pendiente',
          cantidad_sistema,
          descripcion,
          en_sistema,
        });
        setLastScannedId(newId);
        setLastScanFeedback({ codigo, qty, isNew: true, en_sistema });
      }

      playBeep();
      setScanInput('');
      setPreQty(1);

      if (sessionData.isDynamic) {
        setDynamicLocInput('');
        locInputRef.current?.focus();
      } else {
        scanInputRef.current?.focus();
      }
    } catch (err) { console.error(err); }
  };

  const handleUpdateQuantity = async (id, newVal) => {
    const qty = Math.max(0, parseInt(newVal) || 0);
    await db.counting_session.update(id, { cantidad: qty });
  };

  const handleDeleteItem = async (id) => {
    await db.counting_session.delete(id);
    scanInputRef.current?.focus();
  };

  const handleQuantityKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); scanInputRef.current?.focus(); }
  };

  return {
    scanInput, setScanInput,
    dynamicLocInput, setDynamicLocInput,
    preQty, setPreQty,
    lastScannedId,
    lastScanFeedback,
    handleScanSubmit,
    handleLocKeyDown,
    handleUpdateQuantity,
    handleDeleteItem,
    handleQuantityKeyDown,
  };
};

export default useCounterScan;
