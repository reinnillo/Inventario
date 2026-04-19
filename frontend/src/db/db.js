import Dexie from 'dexie';

export const db = new Dexie('reinnillo_Offline_DB');

// Versión 6: elimina verification_session (ya no hay rol verificador)
db.version(6).stores({
  // 1. Tabla Maestra del Cliente (BD local del inventario)
  client_products: '++id, codigo_producto, barcode, descripcion',

  // 2. Tabla de Errores de Importación
  import_errors: '++id, motivo, data_raw',

  // 3. Sesión del Contador (Offline-First)
  // fecha_escaneo indexado para permitir orderBy('fecha_escaneo')
  counting_session: '++id, codigo_producto, marbete, estado, fecha_escaneo'
});

/**
 * Helpers de Limpieza
 */
export const resetClientDB = async () => {
    await db.client_products.clear();
    await db.import_errors.clear();
};
export const resetCountingSession = async () => await db.counting_session.clear();