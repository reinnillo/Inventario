import Dexie from 'dexie';

export const db = new Dexie('reinnillo_Offline_DB');

// Definimos el esquema (Versión 4 - Auditoría Permisiva)
// CAMBIO CLAVE: Subimos a version(4) para forzar la actualización en el navegador.
db.version(4).stores({
  // 1. Tabla Maestra del Cliente
  // codigo_producto: Índice simple (SIN '&'). Esto permite guardar múltiples productos con el mismo código.
  // Agregamos 'barcode' y 'descripcion' como índices para búsquedas futuras.
  client_products: '++id, codigo_producto, barcode, descripcion', 
  
  // 2. Tabla de Errores de Importación
  // data_raw: Para guardar el objeto JSON completo que falló.
  import_errors: '++id, motivo, data_raw',

  // 3. Sesión del Verificador
  verification_session: '++id, codigo_producto, marbete, estado',

  // 4. Sesión del Contador (Offline-First)
  counting_session: '++id, codigo_producto, marbete, estado' 
});

/**
 * Helpers de Limpieza
 */
export const resetVerificationSession = async () => await db.verification_session.clear();
export const resetClientDB = async () => {
    await db.client_products.clear();
    await db.import_errors.clear();
};
export const resetCountingSession = async () => await db.counting_session.clear();