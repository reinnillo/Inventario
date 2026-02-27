// backend/src/controllers/pdfController.js
import PDFDocument from 'pdfkit';
import supabase from '../config/supabaseClient.js';

// --- CONSTANTES DE DISEÑO ---
const COLORS = {
  primary: '#111827', secondary: '#6b7280', accent: '#f3f4f6',
  border: '#e5e7eb', red: '#dc2626', green: '#16a34a', orange: '#f59e0b', blue: '#3b82f6'
};
const MARGIN = 40;
const PAGE_WIDTH = 595.28; 

// --- HELPERS DE DISEÑO REUTILIZABLES ---

const drawHeader = (doc, title, clientData, stats = []) => {
  let y = MARGIN;
  
  // Logo Izquierda
  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.primary).text('reinnillo Inventarios', MARGIN, y);
  y += 28;
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.secondary).text(title.toUpperCase(), MARGIN, y, { characterSpacing: 1 });

  // Caja Cliente Derecha
  const boxW = 200;
  const boxH = 85;
  const boxX = (PAGE_WIDTH - MARGIN) - boxW;
  const boxY = MARGIN; 
  const pad = 12;

  doc.roundedRect(boxX, boxY, boxW, boxH, 6).fill(COLORS.accent);

  const row = (label, value, ry, bold = false, color = COLORS.primary) => {
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.secondary).text(label.toUpperCase(), boxX + pad, ry);
    // Truncar texto largo
    let valStr = String(value);
    if(valStr.length > 30) valStr = valStr.substring(0, 27) + '...';
    
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(color)
       .text(valStr, boxX + pad, ry, { width: boxW - (pad*2), align: 'right' });
  };

  row('Cliente', clientData.nombre || '-', boxY + 12, true);
  row('Ubicación', clientData.direccion || '-', boxY + 30);
  
  if (stats[0]) row(stats[0].label, stats[0].value, boxY + 48);

  doc.moveTo(boxX + pad, boxY + 65).lineTo(boxX + boxW - pad, boxY + 65).lineWidth(0.5).strokeColor('#d1d5db').stroke();
  
  if (stats[1]) row(stats[1].label, stats[1].value, boxY + 72, true, stats[1].color || COLORS.primary);

  // Fecha
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.secondary)
     .text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, MARGIN, 140, { align: 'right', width: PAGE_WIDTH - (MARGIN*2) });
  
  return 170; // Retorna Y donde empieza el contenido
};

// FIX CRÍTICO: Footer con anulación de margen para evitar hojas en blanco
const drawFooter = (doc) => {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    
    // 1. Guardamos margen actual
    const oldBottomMargin = doc.page.margins.bottom;
    
    // 2. Anulamos margen para poder escribir al borde sin detonar nueva página
    doc.page.margins.bottom = 0;

    doc.font('Helvetica').fontSize(8).fillColor(COLORS.secondary);
    doc.text(
      `Generado automáticamente por Sistema reinnillo Inventarios. • Documento Confidencial • Pág ${i + 1} de ${range.count}`,
      MARGIN, 
      doc.page.height - 30, // Posición segura muy abajo
      { align: 'center', width: PAGE_WIDTH - (MARGIN*2) }
    );

    // 3. Restauramos margen (buena práctica)
    doc.page.margins.bottom = oldBottomMargin;
  }
};

const drawTableRow = (doc, y, columns, isHeader = false, bgColor = null) => {
  if (bgColor) doc.rect(MARGIN, y - 4, PAGE_WIDTH - (MARGIN*2), 18).fill(bgColor);
  
  // Reseteamos colores para evitar contaminación
  doc.fillColor(isHeader ? COLORS.secondary : COLORS.primary).font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(isHeader ? 8 : 9);
  
  columns.forEach(col => {
    if (!isHeader && col.color) doc.fillColor(col.color);
    if (!isHeader && col.font) doc.font(col.font);
    
    // Truncado de texto básico para celdas
    let text = String(col.text);
    // Ajuste empírico: ~7px por caracter promedio en font size 9
    // Si el texto es muy largo para el ancho, lo cortamos
    // (PDFKit tiene opciones de wrap, pero en tablas estrictas a veces es mejor truncar o ajustar)
    
    doc.text(text, col.x, y, { width: col.w, align: col.align || 'left', lineBreak: false, ellipsis: true });
    
    // Reset para siguiente col
    doc.fillColor(isHeader ? COLORS.secondary : COLORS.primary).font(isHeader ? 'Helvetica-Bold' : 'Helvetica');
  });

  if (isHeader) doc.moveTo(MARGIN, y + 14).lineTo(PAGE_WIDTH - MARGIN, y + 14).lineWidth(1).strokeColor(COLORS.border).stroke();
};

// --- CONTROLADORES INDIVIDUALES ---

// 1. VARIANZA
export const generateVarianceReport = async (req, res) => {
  const { cliente_id } = req.body;
  if (!cliente_id) return res.status(400).json({ error: 'Cliente ID requerido.' });

  try {
    const { data: cliente } = await supabase.from('clientes').select('nombre, direccion').eq('id', cliente_id).single();
    const { data: verificados } = await supabase.from('inventario_verificado_part')
      .select('codigo_producto, descripcion, cantidad_sistema, cantidad_final, diferencia')
      .eq('cliente_id', cliente_id).neq('diferencia', 0).order('diferencia', { ascending: true });

    let tTeorico = 0, tContado = 0, tDif = 0;
    (verificados || []).forEach(i => {
      tTeorico += Number(i.cantidad_sistema) || 0;
      tContado += Number(i.cantidad_final) || 0;
      tDif += (Number(i.cantidad_final) || 0) - (Number(i.cantidad_sistema) || 0);
    });
    const idxDif = tTeorico > 0 ? Math.round((Math.abs(tDif) / tTeorico) * 100) : 0;

    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Reporte_Varianza.pdf"`);
    doc.pipe(res);

    let y = drawHeader(doc, 'Reporte de Variaciones', cliente || {}, [
      { label: 'Inv. Teórico', value: `${tTeorico} unds` },
      { label: 'Índice Dif.', value: `${idxDif}%`, color: COLORS.red }
    ]);

    const cols = [
      { x: MARGIN, w: 80, title: 'CÓDIGO' },
      { x: MARGIN+90, w: 220, title: 'DESCRIPCIÓN' },
      { x: MARGIN+320, w: 60, title: 'TEÓRICO', align: 'center' },
      { x: MARGIN+390, w: 60, title: 'CONTADO', align: 'center' },
      { x: MARGIN+460, w: 55, title: 'DIF', align: 'center' }
    ];

    const printHeader = (cy) => {
      drawTableRow(doc, cy, cols.map(c => ({ text: c.title, x: c.x, w: c.w, align: c.align })), true);
      return cy + 20;
    };

    y = printHeader(y);

    (verificados || []).forEach((item, i) => {
      if (y > 750) { doc.addPage(); y = 50; y = printHeader(y); }
      const dif = (Number(item.cantidad_final)||0) - (Number(item.cantidad_sistema)||0);
      
      drawTableRow(doc, y, [
        { text: item.codigo_producto || '-', x: cols[0].x, w: cols[0].w },
        { text: item.descripcion || '-', x: cols[1].x, w: cols[1].w },
        { text: Number(item.cantidad_sistema) || 0, x: cols[2].x, w: cols[2].w, align: 'center' },
        { text: Number(item.cantidad_final) || 0, x: cols[3].x, w: cols[3].w, align: 'center' },
        { text: dif > 0 ? `+${dif}` : dif, x: cols[4].x, w: cols[4].w, align: 'center', color: dif < 0 ? COLORS.red : COLORS.green, font: 'Helvetica-Bold' }
      ], false, i % 2 === 0 ? COLORS.accent : null);
      y += 18;
    });

    if (!verificados || verificados.length === 0) {
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(COLORS.secondary)
           .text('Sin variaciones registradas.', MARGIN, y + 10, { align: 'center', width: PAGE_WIDTH - (MARGIN*2) });
    }

    drawFooter(doc);
    doc.end();
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
};

// 2. CÓDIGOS NO CONTADOS
export const generateUncountedReport = async (req, res) => {
  const { cliente_id } = req.body;
  if (!cliente_id) return res.status(400).json({ error: 'Cliente ID requerido.' });

  try {
    const { data: cliente } = await supabase.from('clientes').select('nombre, direccion').eq('id', cliente_id).single();
    
    // Obtener verificados
    const { data: verificados } = await supabase.from('inventario_verificado_part').select('codigo_producto').eq('cliente_id', cliente_id);
    const setVerif = new Set((verificados || []).map(v => v.codigo_producto));

    // Obtener sistema (sin límite para PDF completo)
    const { data: sistema } = await supabase.from('inventarios_cliente_part').select('codigo_producto, descripcion, cantidad, area').eq('id_cliente', cliente_id);
    
    const noContados = (sistema || []).filter(i => !setVerif.has(i.codigo_producto));
    const totalPendiente = noContados.reduce((acc, i) => acc + (Number(i.cantidad)||0), 0);

    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Reporte_No_Contados.pdf"`);
    doc.pipe(res);

    let y = drawHeader(doc, 'Códigos No Contados', cliente || {}, [
      { label: 'Items Pendientes', value: noContados.length },
      { label: 'Stock Riesgo', value: totalPendiente, color: COLORS.orange }
    ]);

    const cols = [
      { x: MARGIN, w: 90, title: 'CÓDIGO' },
      { x: MARGIN+100, w: 250, title: 'DESCRIPCIÓN' },
      { x: MARGIN+360, w: 80, title: 'ÁREA', align: 'center' },
      { x: MARGIN+450, w: 60, title: 'STOCK', align: 'center' }
    ];

    const printHeader = (cy) => {
      drawTableRow(doc, cy, cols.map(c => ({ text: c.title, x: c.x, w: c.w, align: c.align })), true);
      return cy + 20;
    };

    y = printHeader(y);

    noContados.forEach((item, i) => {
      if (y > 750) { doc.addPage(); y = 50; y = printHeader(y); }
      drawTableRow(doc, y, [
        { text: item.codigo_producto || '-', x: cols[0].x, w: cols[0].w },
        { text: item.descripcion || '-', x: cols[1].x, w: cols[1].w },
        { text: item.area || '-', x: cols[2].x, w: cols[2].w, align: 'center' },
        { text: Number(item.cantidad) || 0, x: cols[3].x, w: cols[3].w, align: 'center', font: 'Helvetica-Bold' }
      ], false, i % 2 === 0 ? COLORS.accent : null);
      y += 18;
    });

    if (noContados.length === 0) {
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(COLORS.secondary)
           .text('¡Excelente! Todo el inventario ha sido contado.', MARGIN, y + 10, { align: 'center', width: PAGE_WIDTH - (MARGIN*2) });
    }

    drawFooter(doc);
    doc.end();
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
};

// 3. UBICACIONES PENDIENTES
export const generateLocationsReport = async (req, res) => {
  const { cliente_id } = req.body;
  if (!cliente_id) return res.status(400).json({ error: 'Cliente ID requerido.' });

  try {
    const { data: cliente } = await supabase.from('clientes').select('nombre, direccion').eq('id', cliente_id).single();
    
    // Lógica simplificada de ubicaciones
    const { data: verificados } = await supabase.from('inventario_verificado_part').select('codigo_producto').eq('cliente_id', cliente_id);
    const setVerif = new Set((verificados || []).map(v => v.codigo_producto));
    
    const { data: sistema } = await supabase.from('inventarios_cliente_part').select('codigo_producto, ubicacion, area').eq('id_cliente', cliente_id);
    
    const locMap = new Map();
    (sistema || []).forEach(i => {
      if (!setVerif.has(i.codigo_producto) && i.ubicacion) {
        if (!locMap.has(i.ubicacion)) locMap.set(i.ubicacion, { ubicacion: i.ubicacion, area: i.area, items: 0 });
        locMap.get(i.ubicacion).items++;
      }
    });
    const pendientes = Array.from(locMap.values());

    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Reporte_Ubicaciones.pdf"`);
    doc.pipe(res);

    let y = drawHeader(doc, 'Ubicaciones Pendientes', cliente || {}, [
      { label: 'Zonas Vacías', value: pendientes.length },
      { label: 'Prioridad', value: 'ALTA', color: COLORS.blue }
    ]);

    const cols = [
      { x: MARGIN, w: 150, title: 'UBICACIÓN' },
      { x: MARGIN+160, w: 150, title: 'ÁREA / ZONA' },
      { x: MARGIN+320, w: 100, title: 'ESTADO', align: 'center' },
      { x: MARGIN+430, w: 80, title: 'ITEMS PEND.', align: 'center' }
    ];

    const printHeader = (cy) => {
      drawTableRow(doc, cy, cols.map(c => ({ text: c.title, x: c.x, w: c.w, align: c.align })), true);
      return cy + 20;
    };

    y = printHeader(y);

    pendientes.forEach((item, i) => {
      if (y > 750) { doc.addPage(); y = 50; y = printHeader(y); }
      drawTableRow(doc, y, [
        { text: item.ubicacion || '-', x: cols[0].x, w: cols[0].w, font: 'Helvetica-Bold' },
        { text: item.area || 'General', x: cols[1].x, w: cols[1].w },
        { text: 'Sin Actividad', x: cols[2].x, w: cols[2].w, align: 'center', color: COLORS.red },
        { text: item.items || 0, x: cols[3].x, w: cols[3].w, align: 'center' }
      ], false, i % 2 === 0 ? COLORS.accent : null);
      y += 18;
    });

    if (pendientes.length === 0) {
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(COLORS.secondary)
           .text('Todas las ubicaciones han sido visitadas.', MARGIN, y + 10, { align: 'center', width: PAGE_WIDTH - (MARGIN*2) });
    }

    drawFooter(doc);
    doc.end();
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
};

// 4. VALORACIÓN & KPI
export const generateValuationReport = async (req, res) => {
  const { cliente_id } = req.body;
  if (!cliente_id) return res.status(400).json({ error: 'Cliente ID requerido.' });

  try {
    const { data: cliente } = await supabase.from('clientes').select('nombre, direccion').eq('id', cliente_id).single();
    const { data: verificados } = await supabase.from('inventario_verificado_part').select('cantidad_sistema, cantidad_final, diferencia').eq('cliente_id', cliente_id);

    // Calcular KPIs
    let totalFis = 0, totalSys = 0, totalAbsDiff = 0, itemsError = 0;
    (verificados || []).forEach(i => {
        const f = Number(i.cantidad_final)||0;
        const s = Number(i.cantidad_sistema)||0;
        const d = f - s;
        totalFis += f; totalSys += s; totalAbsDiff += Math.abs(d);
        if(d !== 0) itemsError++;
    });
    
    const accuracySKU = (verificados || []).length > 0 ? (((verificados || []).length - itemsError) / (verificados || []).length) * 100 : 0;
    const accuracyUnits = totalSys > 0 ? (1 - (totalAbsDiff / totalSys)) * 100 : 0;

    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Reporte_Valoracion.pdf"`);
    doc.pipe(res);

    let y = drawHeader(doc, 'Informe de Valoración & KPI', cliente || {}, [
      { label: 'ERI (SKU)', value: `${accuracySKU.toFixed(2)}%`, color: COLORS.green },
      { label: 'ERI (Unds)', value: `${Math.max(0, accuracyUnits).toFixed(2)}%`, color: COLORS.blue }
    ]);

    // Tabla de KPIs
    const kpis = [
        { label: 'Precisión Global (Accuracy SKU)', value: `${accuracySKU.toFixed(2)}%` },
        { label: 'Precisión Global (Accuracy Unidades)', value: `${accuracyUnits.toFixed(2)}%` },
        { label: 'Total SKUs Auditados', value: (verificados || []).length },
        { label: 'Unidades Físicas (Total)', value: totalFis },
        { label: 'Unidades Sistema (Total)', value: totalSys },
        { label: 'Variación Neta (Unidades)', value: totalFis - totalSys, isDiff: true },
        { label: 'Variación Absoluta', value: totalAbsDiff }
    ];

    const boxX = MARGIN + 50;
    const boxW = PAGE_WIDTH - (MARGIN*2) - 100;
    
    y += 20;
    doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.primary).text('Resumen Ejecutivo', MARGIN, y);
    y += 30;

    kpis.forEach((kpi, i) => {
        doc.rect(boxX, y, boxW, 30).fill(i % 2 === 0 ? COLORS.accent : '#ffffff');
        doc.rect(boxX, y, boxW, 30).strokeColor(COLORS.border).stroke();
        
        doc.fillColor(COLORS.secondary).font('Helvetica-Bold').fontSize(10)
           .text(kpi.label.toUpperCase(), boxX + 15, y + 10);
        
        let valColor = COLORS.primary;
        if (kpi.isDiff) valColor = kpi.value < 0 ? COLORS.red : COLORS.green;
        
        doc.fillColor(valColor).font('Helvetica-Bold').fontSize(12)
           .text(kpi.value.toString(), boxX, y + 9, { width: boxW - 20, align: 'right' });
           
        y += 30;
    });

    drawFooter(doc);
    doc.end();
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
};

// 5. PRODUCTOS CONTADOS
export const generateProductosContadosPDF = async (req, res) => {
  const { cliente_id } = req.body;
  if (!cliente_id) return res.status(400).json({ error: 'Cliente ID requerido.' });

  try {
    const { data: cliente } = await supabase.from('clientes').select('nombre, direccion').eq('id', cliente_id).single();

    // 1. Obtener todos los conteos para el cliente
    const { data: conteos, error: conteosError } = await supabase
      .from('conteos_part')
      .select('codigo_producto, cantidad, ubicacion, area, marbete, nombre_contador, fecha_escaneo')
      .eq('cliente_id', cliente_id);

    if (conteosError) throw conteosError;

    // 2. Obtener la información de los productos (descripción, categoría)
    const codigos = [...new Set((conteos || []).map(c => c.codigo_producto))];
    const { data: productos, error: productosError } = await supabase
      .from('inventarios_cliente_part')
      .select('codigo_producto, descripcion, categoria')
      .eq('id_cliente', cliente_id)
      .in('codigo_producto', codigos);

    if (productosError) throw productosError;

    // 3. Crear un mapa para búsqueda rápida de info de producto
    const productosMap = new Map((productos || []).map(p => [p.codigo_producto, p]));

    // 4. Unir los datos
    const reportData = (conteos || []).map(conteo => ({
      ...conteo,
      descripcion: productosMap.get(conteo.codigo_producto)?.descripcion || '-',
      categoria: productosMap.get(conteo.codigo_producto)?.categoria || '-',
    }));
      
    const totalContados = reportData.reduce((acc, i) => acc + (Number(i.cantidad) || 0), 0);

    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Reporte_Productos_Contados.pdf"`);
    doc.pipe(res);

    let y = drawHeader(doc, 'Reporte de Productos Contados', cliente || {}, [
      { label: 'SKUs Contados', value: reportData.length },
      { label: 'Unidades Totales', value: totalContados, color: COLORS.blue }
    ]);

    const cols = [
      { x: 40, w: 75, title: 'CÓDIGO' },
      { x: 121, w: 160, title: 'DESCRIPCIÓN' },
      { x: 287, w: 70, title: 'CATEGORÍA' },
      { x: 363, w: 70, title: 'ÁREA' },
      { x: 439, w: 70, title: 'UBICACIÓN' },
      { x: 515, w: 40, title: 'CANT', align: 'right' }
    ];

    const printHeader = (cy) => {
      drawTableRow(doc, cy, cols.map(c => ({ text: c.title, x: c.x, w: c.w, align: c.align })), true);
      return cy + 20;
    };

    y = printHeader(y);

    reportData.forEach((item, i) => {
      if (y > 750) { doc.addPage(); y = 50; y = printHeader(y); }
      
      drawTableRow(doc, y, [
        { text: item.codigo_producto || '-', x: cols[0].x, w: cols[0].w },
        { text: item.descripcion || '-', x: cols[1].x, w: cols[1].w },
        { text: item.categoria || '-', x: cols[2].x, w: cols[2].w },
        { text: item.area || '-', x: cols[3].x, w: cols[3].w },
        { text: item.ubicacion || '-', x: cols[4].x, w: cols[4].w },
        { text: Number(item.cantidad) || 0, x: cols[5].x, w: cols[5].w, align: 'right', font: 'Helvetica-Bold' }
      ], false, i % 2 === 0 ? COLORS.accent : null);
      y += 18;
    });

    if (reportData.length === 0) {
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(COLORS.secondary)
           .text('No se han registrado conteos para este cliente.', MARGIN, y + 10, { align: 'center', width: PAGE_WIDTH - (MARGIN*2) });
    }

    drawFooter(doc);
    doc.end();
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
};