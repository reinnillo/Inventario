// frontend/src/module/contador/hooks/useClientDB.js
// Gestiona la BD local de productos del cliente (client_products).
// La descarga es manual (botón) y persiste entre sesiones.
// Solo se borra al hacer un refresh explícito.
//
// Parámetros:
//   user  — objeto de usuario autenticado (cliente_id)
//   toast — instancia del sistema de notificaciones

import { useState, useEffect } from 'react';
import { db, resetClientDB } from '../../../db/db';
import { API_URL } from '../../../config/api';

/**
 * @param {{ user, toast }}
 * @returns {{ localDbCount, isDownloading, downloadClientDB }}
 */
const useClientDB = ({ user, toast }) => {
  const [localDbCount,  setLocalDbCount]  = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  // Leer conteo al montar (la BD persiste entre sesiones)
  useEffect(() => {
    db.client_products.count()
      .then(setLocalDbCount)
      .catch(() => {});
  }, []);

  const downloadClientDB = async () => {
    if (!user?.cliente_id) {
      toast.error('No se puede descargar: usuario sin cliente asignado.');
      return;
    }

    setIsDownloading(true);
    try {
      // Limpiar BD local antes de descargar la nueva versión
      await resetClientDB();

      const res  = await fetch(`${API_URL}/api/inventario?cliente_id=${user.cliente_id}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error del servidor');

      if (!data.inventory || data.inventory.length === 0) {
        toast.warning('El inventario del cliente está vacío en el servidor.');
        setLocalDbCount(0);
        return;
      }

      // Mapear y deduplicar por codigo_producto
      const rawProducts = data.inventory.map(p => ({
        codigo_producto: String(p.codigo_producto).trim(),
        descripcion:     p.descripcion  || '',
        cantidad:        p.cantidad     ?? 0,
        barcode:         p.barcode      || null,
        area:            p.area         || null,
        ubicacion:       p.ubicacion    || null,
      }));

      const uniqueMap = new Map();
      rawProducts.forEach(p => {
        if (p.codigo_producto) uniqueMap.set(p.codigo_producto, p);
      });
      const uniqueProducts = Array.from(uniqueMap.values());

      await db.client_products.bulkPut(uniqueProducts);
      setLocalDbCount(uniqueProducts.length);
      toast.success(`BD Sincronizada: ${uniqueProducts.length} productos.`);

    } catch (err) {
      toast.error('Error descarga: ' + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return { localDbCount, isDownloading, downloadClientDB };
};

export default useClientDB;
