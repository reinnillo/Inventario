// backend/src/controllers/countingController.js
import supabase from '../config/supabaseClient.js';
import { updateSessionStats, updateGlobalStats } from '../services/statsService.js'; // <--- Importamos servicio

// POST: Sincronización Masiva
export const syncBatchCounts = async (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Datos inválidos.' });
  }

  console.log(`📦 Recibiendo ${items.length} conteos...`);

  try {
    const cleanItems = items.map(item => ({
      cliente_id:           item.cliente_id || 1,
      area:                 item.area ? String(item.area) : null,
      ubicacion:            item.ubicacion ? String(item.ubicacion) : null,
      marbete:              item.marbete ? String(item.marbete) : "S/M",
      codigo_producto:      item.codigo_producto ? String(item.codigo_producto) : null,
      cantidad:             Number(item.cantidad) || 0,
      cantidad_sistema:     item.cantidad_sistema != null ? Number(item.cantidad_sistema) : null,
      descripcion:          item.descripcion || null,
      diferencia:           item.diferencia  != null ? Number(item.diferencia)  : null,
      fecha_escaneo:        item.fecha_escaneo || new Date(),
      contador_id:          item.contador_id || null,
      nombre_contador:      item.nombre_contador || 'Desconocido',
      fecha_inicio_marbete: item.fecha_inicio_marbete || null,
      fecha_fin_marbete:    item.fecha_fin_marbete || null,
      es_recuento:          item.es_recuento === true,
      estado:               'pendiente',
      fecha_sincronizado:   new Date()
    }));

    const { data, error } = await supabase.from('conteos_part').insert(cleanItems).select();

    if (error) {
      console.error("Error Supabase:", error);
      throw error;
    }

    // --- ALIMENTACIÓN DE MÉTRICAS (Background) ---
    // No esperamos (await) obligatoriamente para responder rápido al cliente,
    // o sí esperamos si queremos garantizar consistencia. Esperaremos para seguridad.
    const userId = cleanItems[0].contador_id;
    if (userId) {
        await updateSessionStats(userId, 'contador');
        await updateGlobalStats(userId);
    }

    console.log("✅ Sync completado y métricas actualizadas.");

    return res.status(201).json({ 
      message: 'Sincronización exitosa.', 
      count: data.length,
      timestamp: new Date()
    });

  } catch (err) {
    console.error('Sync Error:', err.message);
    return res.status(500).json({ error: `Fallo al guardar: ${err.message}` });
  }
};

// GET: Historial (Se mantiene igual)
export const getCountingHistory = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('conteos_part')
      .select('cantidad, fecha_escaneo, marbete')
      .eq('contador_id', id)
      .order('fecha_escaneo', { ascending: false });

    if (error) throw error;
    return res.json({ history: data });
  } catch (err) {
    return res.status(500).json({ error: 'Error historial.' });
  }
};