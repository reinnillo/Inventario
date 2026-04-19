// controllers/reportsController.js
import supabase from '../config/supabaseClient.js';
import { logAudit } from '../services/auditService.js';

// HELPER: ENRIQUECIMIENTO DE DATOS (CRUCE DE TABLAS)
// Toma items verificados y busca sus datos maestros (Costo, Area, Ubicación) en el inventario del cliente.
const enrichWithMasterData = async (items, cliente_id) => {
  if (!items || items.length === 0) return [];

  // 1. Extraer códigos únicos para optimizar la consulta
  const codigos = [...new Set(items.map(i => i.codigo_producto).filter(c => c))];

  // 2. Traer datos maestros (Costo, Area, Ubicación) de la tabla CORRECTA
  const { data: maestro, error } = await supabase
    .from('inventarios_cliente_part')
    .select('codigo_producto, costo, area, ubicacion')
    .eq('id_cliente', cliente_id)
    .in('codigo_producto', codigos)
    .limit(50000);

  if (error) {
      console.error("Error en enrichment:", error);
      return items; // Retornamos sin enriquecer si falla, para no romper todo
  }

  // 3. Crear Mapa para búsqueda rápida O(1)
  const maestroMap = new Map();
  if (maestro) {
    maestro.forEach(m => maestroMap.set(m.codigo_producto, m));
  }

  // 4. Fusionar
  return items.map(item => {
    const master = maestroMap.get(item.codigo_producto) || {};
    return {
      ...item,
      costo: Number(master.costo || 0),
      area: master.area || 'Sin Asignar',
      ubicacion: master.ubicacion || 'Sin Asignar'
    };
  });
};

// HELPER: AUDITORÍA GENÉRICA
const logReportAudit = async (req, admin_id, admin_name, admin_role, cliente_id, cliente_name, report_type) => {
  if(admin_id || cliente_id) {
    await logAudit({
      admin_id,
      admin_name,
      admin_role,
      target_id: cliente_id,
      target_label: cliente_name,
      action: `GENERATE_${report_type.toUpperCase()}_REPORT`,
      module: 'REPORTS',
      details: { reason: 'Generación de reporte', report_type: report_type.toUpperCase() },
      req
    });
  }
};

/**
 * REPORTE 1: VARIACIONES
 */
export const getVariationsReport = async (req, res) => {
  const { admin_id, admin_name, admin_role, cliente_id, cliente_name } = req.query;
  if (!cliente_id) return res.status(400).json({ error: 'Cliente ID requerido' });

  try {
    // AUDITORÍA
    await logReportAudit(req, admin_id, admin_name, admin_role, cliente_id, cliente_name, 'VARIATIONS');

    // PASO 1: Obtener datos de VERIFICACIÓN (Solo columnas que existen en esta tabla)
    const { data: verificados, error } = await supabase
      .from('inventario_verificado_part')
      .select('codigo_producto, descripcion, cantidad_sistema, cantidad_final, diferencia, nombre_verificador, es_forzado') 
      .eq('cliente_id', cliente_id)
      .neq('diferencia', 0) // Solo discrepancias
      .order('diferencia', { ascending: true });

    if (error) throw error;

    // PASO 2: Enriquecer con datos MAESTROS (Costo, Area, Ubicación)
    const enrichedData = await enrichWithMasterData(verificados, cliente_id);

    return res.json({ data: enrichedData });
  } catch (err) {
    console.error("Variations Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * REPORTE 2: CÓDIGOS NO CONTADOS
 */
export const getUncountedCodesReport = async (req, res) => {
  const { admin_id, admin_name, admin_role, cliente_id, cliente_name } = req.query;
  if (!cliente_id) return res.status(400).json({ error: 'Cliente ID requerido' });

  try {
    // AUDITORÍA
    await logReportAudit(req, admin_id, admin_name, admin_role, cliente_id, cliente_name, 'UNCOUNTED_CODES');

    // 1. Obtener lista de códigos YA verificados
    const { data: verificados } = await supabase
      .from('inventario_verificado_part')
      .select('codigo_producto')
      .eq('cliente_id', cliente_id);
    
    const codigosVerificados = new Set((verificados || []).map(v => v.codigo_producto));

    // 2. Traer todo el sistema — límite alto explícito para evitar el cap de 1000 de PostgREST
    const { data: sistema, error: errSys } = await supabase
      .from('inventarios_cliente_part')
      .select('codigo_producto, descripcion, cantidad, costo, area, ubicacion')
      .eq('id_cliente', cliente_id)
      .limit(50000);

    if (errSys) throw errSys;

    // 3. Filtrar en memoria (Lo que existe en sistema PERO NO en verificados)
    const noContados = (sistema || []).filter(item => !codigosVerificados.has(item.codigo_producto));

    return res.json({ data: noContados });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * REPORTE 3: UBICACIONES NO CONTADAS
 */
export const getUncountedLocationsReport = async (req, res) => {
  const { admin_id, admin_name, admin_role, cliente_id, cliente_name } = req.query;
  if (!cliente_id) return res.status(400).json({ error: 'Cliente ID requerido' });

  try {
    // AUDITORÍA
    await logReportAudit(req, admin_id, admin_name, admin_role, cliente_id, cliente_name, 'UNCOUNTED_LOCATIONS');

    // 1. Obtener productos verificados para inferir ubicaciones tocadas
    // Estrategia: Si un producto fue contado, asumimos que su ubicación teórica fue visitada.
    const { data: verificados } = await supabase
      .from('inventario_verificado_part')
      .select('codigo_producto') 
      .eq('cliente_id', cliente_id);
      
    const codigosVerificados = new Set((verificados || []).map(v => v.codigo_producto));

    // 2. Traer ubicaciones del sistema — límite alto explícito para evitar el cap de 1000 de PostgREST
    const { data: sistema } = await supabase
      .from('inventarios_cliente_part')
      .select('codigo_producto, ubicacion, area')
      .eq('id_cliente', cliente_id)
      .limit(50000);

    if (!sistema) return res.json({ data: [] });

    const ubicacionesPendientes = new Map();

    sistema.forEach(item => {
        // Si el producto NO fue verificado
        if (!codigosVerificados.has(item.codigo_producto)) {
            // Y tiene ubicación asignada
            if (item.ubicacion && !ubicacionesPendientes.has(item.ubicacion)) {
                ubicacionesPendientes.set(item.ubicacion, {
                    ubicacion: item.ubicacion,
                    area: item.area || 'General',
                    estado: 'Pendiente'
                });
            }
        }
    });

    return res.json({ data: Array.from(ubicacionesPendientes.values()) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * REPORTE 4: KPI & VALORACIÓN (ENRIQUECIDO)
 */
export const getValuationReport = async (req, res) => {
  const { admin_id, admin_name, admin_role, cliente_id, cliente_name } = req.query;
  if (!cliente_id) return res.status(400).json({ error: 'Cliente ID requerido' });
  
  try {
    // AUDITORÍA
    await logReportAudit(req, admin_id, admin_name, admin_role, cliente_id, cliente_name, 'VALUATION');

    // 1. Obtener datos básicos de verificación (Sin costo)
    const { data: verificados, error } = await supabase
      .from('inventario_verificado_part')
      .select('codigo_producto, cantidad_sistema, cantidad_final, diferencia') // CORRECCIÓN: Quitamos 'costo'
      .eq('cliente_id', cliente_id);

    if (error) throw error;
    if (!verificados || verificados.length === 0) return res.json({ data: [] });

    // 2. Enriquecer con costos desde el maestro
    const enrichedData = await enrichWithMasterData(verificados, cliente_id);

    // 3. Cálculos
    let totalItems = enrichedData.length;
    let totalFisico = 0;
    let totalSistema = 0;
    let totalVarAbs = 0;
    let valorSobrante = 0;
    let valorFaltante = 0;
    let itemsConError = 0;

    enrichedData.forEach(item => {
        const fisico = Number(item.cantidad_final) || 0;
        const sistema = Number(item.cantidad_sistema) || 0;
        const costo = Number(item.costo) || 0;
        const diff = fisico - sistema;

        totalFisico += fisico;
        totalSistema += sistema;
        totalVarAbs += Math.abs(diff);

        if (diff !== 0) {
            itemsConError++;
            if (diff > 0) valorSobrante += (diff * costo);
            else valorFaltante += (Math.abs(diff) * costo);
        }
    });

    // Formulas de Accuracy
    const accuracySKU = totalItems > 0 ? ((totalItems - itemsConError) / totalItems) * 100 : 0;
    // Accuracy Unidades: 1 - (|Diff Total| / Total Sistema)
    const accuracyUnits = totalSistema > 0 ? (1 - (totalVarAbs / totalSistema)) * 100 : 0; 
    // Nota: accuracyUnits puede ser negativo si el desastre es total, lo limitamos a 0 visualmente si quieres.

    const reporte = [
        { metrica: "Precisión Global (SKU)", valor: `${accuracySKU.toFixed(2)}%` },
        { metrica: "Precisión Global (Unidades)", valor: `${Math.max(0, accuracyUnits).toFixed(2)}%` },
        { metrica: "Total SKUs Auditados", valor: totalItems },
        { metrica: "Unidades Físicas (Total)", valor: totalFisico },
        { metrica: "Unidades Sistema (Total)", valor: totalSistema },
        { metrica: "Diferencia Neta (Unidades)", valor: totalFisico - totalSistema },
        { metrica: "Valor Faltante (Pérdida)", valor: `$${valorFaltante.toFixed(2)}` },
        { metrica: "Valor Sobrante", valor: `$${valorSobrante.toFixed(2)}` },
        { metrica: "Balance Neto", valor: `$${(valorSobrante - valorFaltante).toFixed(2)}` }
    ];

    return res.json({ data: reporte });
  } catch (err) {
    console.error("Valuation Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * REPORTE 5: PRODUCTOS CONTADOS (RAW DATA)
 */
export const getCountedProductsReport = async (req, res) => {
  const { admin_id, admin_name, admin_role, cliente_id, cliente_name } = req.query;
  if (!cliente_id) return res.status(400).json({ error: 'Cliente ID requerido' });

  try {
    // AUDITORÍA
    await logReportAudit(req, admin_id, admin_name, admin_role, cliente_id, cliente_name, 'COUNTED_PRODUCTS');

    const { data, error } = await supabase
      .from('conteos_part')
      .select('*')
      .eq('cliente_id', cliente_id)
      .order('fecha_escaneo', { ascending: false });

    if (error) throw error;

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};