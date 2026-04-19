// frontend/src/module/contador/constants.js
// Valores escalares compartidos por todos los archivos del módulo.

export const BATCH_LIMIT_MAX  = 800;   // Máximo de registros por lote antes de forzar sync
export const SYNC_CHUNK_SIZE  = 500;   // Registros por chunk en cada petición al servidor
export const TABLE_VIEW_LIMIT = 50;    // Filas visibles en la tabla (las más recientes)
export const HISTORY_KEY      = 'counter_history';  // Clave localStorage del historial
export const MAX_HISTORY      = 20;    // Máximo de entradas en el historial local
export const SESSION_KEY      = 'counter_meta';     // Clave localStorage de la sesión activa
