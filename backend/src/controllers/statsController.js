// backend/src/controllers/statsController.js
import supabase from '../config/supabaseClient.js';
import { updateSessionStats, updateGlobalStats } from '../services/statsService.js';

// --- HELPER MATEMÁTICO: PARSEAR INTERVALOS DE POSTGRES ---
// Convierte strings como "2 hours 30 minutes" o "05:00:00" a horas decimales para cálculos matemáticos
const parsePostgresIntervalToHours = (intervalStr) => {
    if (!intervalStr) return 0;
    
    let hours = 0;
    let minutes = 0;

    // Caso 1: Formato texto "X hours Y minutes" (Salida estándar de Postgres to JSON)
    if (intervalStr.includes('hour') || intervalStr.includes('minute')) {
        const hMatch = intervalStr.match(/(\d+)\s*hour/);
        const mMatch = intervalStr.match(/(\d+)\s*minute/);
        if (hMatch) hours = parseInt(hMatch[1]);
        if (mMatch) minutes = parseInt(mMatch[1]);
    } 
    // Caso 2: Formato HH:MM:SS (Postgres raw time)
    else if (intervalStr.includes(':')) {
        const parts = intervalStr.split(':');
        hours = parseInt(parts[0]) || 0;
        minutes = parseInt(parts[1]) || 0;
    }

    return hours + (minutes / 60);
};

// getCounterMetrics — métricas de sesión diaria del contador

export const getCounterMetrics = async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'ID requerido.' });

  try {
    const { data: conteos, error: errConteos } = await supabase
      .from('conteos_part')
      .select('cantidad, codigo_producto, fecha_inicio_marbete, fecha_fin_marbete, fecha_escaneo, cliente_id')
      .eq('contador_id', userId);

    if (errConteos) throw errConteos;

    const today = new Date().toISOString().slice(0, 10);
    const conteosHoy = (conteos || []).filter(c => c.fecha_escaneo && c.fecha_escaneo.startsWith(today));

    if (conteosHoy.length === 0) {
        return res.json({ metrics: { piezas: 0, skus: 0, velocidad: 0, tiempo: "0h 0m", precision: 100, historicoPiezas: 0 } });
    }

    const piezasTotal = conteos ? conteos.reduce((acc, c) => acc + (c.cantidad || 0), 0) : 0;
    const piezasSesion = conteosHoy.reduce((acc, c) => acc + (c.cantidad || 0), 0);
    const skusSet = new Set(conteosHoy.map(c => c.codigo_producto));
    const skusSesion = skusSet.size;

    let tiempoActivoMs = 0;
    conteosHoy.forEach(c => {
        if (c.fecha_inicio_marbete && c.fecha_fin_marbete) {
            const diff = new Date(c.fecha_fin_marbete) - new Date(c.fecha_inicio_marbete);
            if (diff > 0 && diff < 86400000) tiempoActivoMs += diff;
        }
    });

    const horas = Math.floor(tiempoActivoMs / 3600000);
    const minutos = Math.floor((tiempoActivoMs % 3600000) / 60000);
    const tiempoActivoStr = `${horas}h ${minutos}m`;
    
    const horasDecimal = tiempoActivoMs / 3600000;
    const velocidad = (horasDecimal > 0.01) ? Math.round(piezasSesion / horasDecimal) : piezasSesion * 60; 
    
    const precision = 98.5; 

    // Sync Background
    await updateSessionStats(userId, 'contador');

    return res.json({
      metrics: { piezas: piezasSesion, skus: skusSesion, velocidad, tiempo: tiempoActivoStr, precision, historicoPiezas: piezasTotal }
    });

  } catch (err) {
    return res.status(500).json({ error: 'Error contador: ' + err.message });
  }
};

// GET: PERFIL GLOBAL DEL EMPLEADO (Lifetime Stats)
// Esta función recalcula TODO el historial para actualizar la reputación global del usuario.
export const getGlobalEmployeeStats = async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'ID requerido.' });

  try {
    // 1. DATA HISTÓRICA COMPLETA DE TRABAJO (Evidencia de volumen)
    const { data: conteos } = await supabase.from('conteos_part').select('cantidad, codigo_producto, cliente_id').eq('contador_id', userId);
    const { data: verif } = await supabase.from('inventario_verificado_part').select('cantidad_final, codigo_producto, cliente_id, diferencia').eq('verificador_id', userId);
    
    // 2. DATA HISTÓRICA DE TIEMPO (Sesiones cerradas)
    // Traemos el historial de todas las sesiones para sumar horas reales trabajadas
    const { data: sesiones } = await supabase.from('employee_session_stats').select('tiempo_activo').eq('usuario_id', userId);

    const safeConteos = conteos || [];
    const safeVerif = verif || [];
    const safeSesiones = sesiones || [];

    // --- CÁLCULO DE VOLUMEN TOTAL (UNIDADES) ---
    // Sumamos cantidades unitarias (PIEZAS), no conteo de filas, para ser justos con el esfuerzo
    const piezasC = safeConteos.reduce((acc, c) => acc + (c.cantidad || 0), 0);
    const piezasV = safeVerif.reduce((acc, v) => acc + (Number(v.cantidad_final) || 0), 0);
    const piezasTotalesHistoricas = piezasC + piezasV;
    
    // --- VARIABILIDAD ---
    const skusSet = new Set([...safeConteos.map(c => c.codigo_producto), ...safeVerif.map(v => v.codigo_producto)]);
    const clientesSet = new Set([...safeConteos.map(c => c.cliente_id), ...safeVerif.map(v => v.cliente_id)]);

    // --- TIEMPO TOTAL TRABAJADO (DENOMINADOR) ---
    // Sumamos los intervalos de todas las sesiones históricas para obtener el tiempo real de vida
    let horasRealesTotales = 0;
    
    if (safeSesiones.length > 0) {
        safeSesiones.forEach(s => {
            horasRealesTotales += parsePostgresIntervalToHours(s.tiempo_activo);
        });
    }
    
    // Si hay piezas pero no hay sesiones registradas (data legacy), estimamos para no romper la división
    if (horasRealesTotales === 0 && piezasTotalesHistoricas > 0) {
        horasRealesTotales = piezasTotalesHistoricas / 400; // Fallback conservador
    }

    // --- KPI: VELOCIDAD PROMEDIO DE CARRERA ---
    // Fórmula Justa: (Total de Piezas de Toda la Vida) / (Total de Horas de Toda la Vida)
    // Esto asegura que un día rápido suba el promedio global, y un día lento lo baje ponderadamente.
    const velocidadPromedioGlobal = horasRealesTotales > 0.1 
        ? Math.round(piezasTotalesHistoricas / horasRealesTotales) 
        : 0;

    // --- KPI: PRECISIÓN HISTÓRICA ---
    // Basada en el % de verificaciones sin diferencia a lo largo del tiempo
    // (Total Aciertos / Total Verificaciones)
    const aciertos = safeVerif.filter(v => Number(v.diferencia) === 0).length;
    const precisionGlobal = safeVerif.length > 0 
        ? ((aciertos / safeVerif.length) * 100).toFixed(2) 
        : 100.00;

    // Formatear para BD (Intervalo Postgres)
    const horasEnteras = Math.floor(horasRealesTotales);
    const minutosRestantes = Math.round((horasRealesTotales - horasEnteras) * 60);
    const intervaloPostgres = `${Math.max(0, horasEnteras)} hours ${Math.max(0, minutosRestantes)} minutes`;

    // 3. ACTUALIZAR PERFIL (employee_stats)
    // Guardamos la foto actual del rendimiento para consultas rápidas
    const statsPayload = {
        usuario_id: userId,
        piezas_totales_contadas: piezasC,
        piezas_totales_verificadas: piezasV,
        skus_totales_procesados: skusSet.size,
        precision_global: Number(precisionGlobal),
        horas_totales_trabajadas: intervaloPostgres,
        inventarios_trabajados: clientesSet.size,
        velocidad_promedio: velocidadPromedioGlobal,
        fecha_creado: new Date() // Actualizamos timestamp de última analítica
    };

    // Upsert para mantener el perfil al día
    await supabase.from('employee_stats').upsert(statsPayload, { onConflict: 'usuario_id' });

    // 4. RETORNAR AL FRONTEND
    return res.json({ profile: statsPayload });

  } catch (err) {
    console.error('Global Profile Error:', err);
    return res.status(500).json({ error: 'Error generando perfil global.' });
  }
};