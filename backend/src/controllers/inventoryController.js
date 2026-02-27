// backend/src/controllers/inventoryController.js
import supabase from '../config/supabaseClient.js';
import { logAudit } from '../services/auditService.js';

// GET: Obtener Inventario Maestro
// ESTRATEGIA: Paginación Recursiva con Reintentos (Bulletproof Fetch)
export const getClientInventory = async (req, res) => {
  const { cliente_id, page, pageSize, actor_id, actor_name, actor_role, target_label } = req.query;

  if (!cliente_id) {
    return res.status(400).json({ error: 'ID de cliente requerido.' });
  }

  try {
    // --- LÓGICA DE AUDITORÍA (No bloqueante) ---
    // Registramos que alguien está consultando datos sensibles
    if (actor_id) {
        logAudit({
            actor_id: actor_id,
            actor_name: actor_name || 'Desconocido',
            actor_role: actor_role || 'unknown',
            action: 'READ_INVENTORY_MASTER',
            module: 'INVENTORY',
            target_id: cliente_id,
            target_label: target_label || 'N/A',
            details: { 
                mode: (page && pageSize) ? 'Paginado' : 'Descarga Completa' 
            },
            req // Pasamos request para capturar IP
        });
    }

    // MODALIDAD 1: PAGINACIÓN VISUAL (Tablas Admin)
    if (page && pageSize) {
      const p = parseInt(page);
      const ps = parseInt(pageSize);
      const from = (p - 1) * ps;
      const to = from + ps - 1;

      const { data, error, count } = await supabase
        .from('inventarios_cliente_part')
        .select('*', { count: 'exact' })
        .eq('id_cliente', cliente_id)
        .order('codigo_producto', { ascending: true })
        .range(from, to);

      if (error) throw error;
      return res.status(200).json({ count: count, inventory: data });
    }

    // MODALIDAD 2: EXTRACCIÓN MASIVA (STREAMING)
    // Optimizada para bajo consumo de RAM: Escribe en el socket a medida que recibe datos.
    
    // 1. Obtener total primero (Metadata)
    const { count, error: countError } = await supabase
      .from('inventarios_cliente_part')
      .select('*', { count: 'exact', head: true })
      .eq('id_cliente', cliente_id);

    if (countError) throw countError;

    // 2. Iniciar Stream JSON manual
    res.setHeader('Content-Type', 'application/json');
    res.write(`{"count":${count},"inventory":[`);

    let hasMore = true;
    let currentDataPage = 0;
    const CHUNK_SIZE = 1000; 
    const MAX_RETRIES = 3;
    let isFirstChunk = true;

    console.log(`🔄 [Stream] Iniciando descarga para Cliente ${cliente_id} (${count} registros)...`);

    while (hasMore) {
      const from = currentDataPage * CHUNK_SIZE;
      const to = from + CHUNK_SIZE - 1;
      let chunkData = null;
      let attempts = 0;

      while (attempts < MAX_RETRIES && !chunkData) {
        try {
          const { data, error } = await supabase
            .from('inventarios_cliente_part')
            .select('*')
            .eq('id_cliente', cliente_id)
            .order('id', { ascending: true })
            .range(from, to);

          if (error) throw error;
          chunkData = data;
        } catch (err) {
          attempts++;
          console.warn(`⚠️ Error chunk ${currentDataPage}: ${err.message}`);
          if (attempts >= MAX_RETRIES) throw err;
          await new Promise(r => setTimeout(r, 500 * attempts));
        }
      }

      if (chunkData && chunkData.length > 0) {
        // Serializar chunk y quitar corchetes [ ... ] para inyectar en el array principal
        const jsonChunk = JSON.stringify(chunkData);
        const content = jsonChunk.substring(1, jsonChunk.length - 1);
        
        if (content.length > 0) {
            if (!isFirstChunk) res.write(',');
            res.write(content);
            isFirstChunk = false;
        }

        currentDataPage++;
        if (chunkData.length < CHUNK_SIZE) hasMore = false;
      } else {
        hasMore = false;
      }
    }

    res.write(']}');
    res.end();
    console.log(`✅ [Stream] Descarga completada.`);

  } catch (err) {
    console.error('🔥 Error Crítico Get Inventory:', err.message);
    if (!res.headersSent) {
        return res.status(500).json({ error: 'Error al recuperar inventario maestro.' });
    } else {
        res.end(); // Cerrar stream si ya empezó
    }
  }
};

// POST: Carga Masiva (Bulk Import)
export const bulkImportInventory = async (req, res) => {
  const { items, cliente_id, admin_id, admin_name, admin_role, cliente_name, cliente_detailsAuditoria } = req.body;

  if (!items || !Array.isArray(items) || !cliente_id) {
    return res.status(400).json({ error: 'Datos de importación inválidos.' });
  }

  console.log(`📦 [Import] Recibiendo ${items.length} productos para Cliente ${cliente_id}...`);

  try {
    const cleanItems = items.map(item => ({
      id_cliente: cliente_id,
      codigo_producto: String(item.codigo_producto || item.codigo || "").trim(), 
      descripcion: item.descripcion || 'Sin descripción',
      cantidad: Math.max(0, Number(item.cantidad) || 0),
      area: item.area || null,
      ubicacion: item.ubicacion || null,
      marbete: item.marbete || null,
      barcode: item.barcode || null,
      costo: Math.max(0, Number(item.costo) || 0),
      unidad_medida: item.unidad_medida || 'UN',
      categoria: item.categoria || null,
      fecha_cargado: new Date()
    }));

    // REFACTOR: Batching (Lotes) para evitar Payload Too Large
    const CHUNK_SIZE = 1000;
    let totalProcessed = 0;

    for (let i = 0; i < cleanItems.length; i += CHUNK_SIZE) {
      const chunk = cleanItems.slice(i, i + CHUNK_SIZE);
      
      // Usamos upsert para mayor robustez (actualiza si existe conflicto de PK/Unique)
      const { error } = await supabase
        .from('inventarios_cliente_part')
        .upsert(chunk) 
        .select('id'); // Solo traemos ID para confirmar, no todo el objeto

      if (error) throw error;
      totalProcessed += chunk.length;
    }

    // Auditoria para importación masiva.
    await logAudit({
        actor_id: admin_id || null,
        actor_name: admin_name || 'desconocido',
        actor_role: admin_role || 'unknown',
        action: 'BULK_IMPORT',
        module: 'INVENTORY',
        target_id: cliente_id || null,
        target_label: `Cliente : ${cliente_name || 'N/A'}`,
        details: cliente_detailsAuditoria || 'N/A',
        req
    });

    return res.status(201).json({ 
      message: 'Carga masiva completada.', 
      count: totalProcessed 
    });

  } catch (err) {
    console.error('Error Bulk Import:', err.message);
    return res.status(500).json({ error: 'Fallo crítico en importación: ' + err.message });
  }
};

// DELETE: Eliminar Inventario Completo
export const deleteClientInventory = async (req, res) => {
  const { cliente_id, admin_id, admin_name, admin_role, cliente_name } = req.body; 

  if (!cliente_id) {
    return res.status(400).json({ error: 'Confirmación de cliente requerida.' });
  }

  try {
    // REFACTOR: Optimización de borrado (Count + Delete ciego)
    // 1. Contamos primero (rápido)
    const { count } = await supabase
      .from('inventarios_cliente_part')
      .select('*', { count: 'exact', head: true })
      .eq('id_cliente', cliente_id);

    // 2. Borramos sin traer datos de vuelta (muy rápido)
    const { error } = await supabase
      .from('inventarios_cliente_part')
      .delete()
      .eq('id_cliente', cliente_id);

    if (error) throw error;

    // 3. AUDITORÍA CRÍTICA: Eliminación de inventario
    await logAudit({
        actor_id: admin_id || null,
        actor_name: admin_name || 'desconocido',
        actor_role: admin_role || 'unknown',
        action: 'DELETE_INVENTORY',
        module: 'INVENTORY',
        target_id: cliente_id || null,
        target_label: `Cliente : ${cliente_name || 'N/A'}`,
        details: { reason: 'Deleted Inventory', deletedCount: count },
        req
    });

    return res.status(200).json({ 
      message: 'Inventario eliminado correctamente.', 
      deletedCount: count 
    });

  } catch (err) {
    console.error('Error Delete Inventory:', err.message);
    return res.status(500).json({ error: 'Fallo al eliminar inventario.' });
  }
};