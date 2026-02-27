// frontend/src/components/Reports/Reports.jsx
import React, { useState, useEffect } from "react";
import { 
  FileBarChart, Download, FileWarning, MapPinOff, 
  TrendingUp, CheckSquare, Settings, Loader2, Printer 
} from "lucide-react";
import { useClients } from "../../context/ClientContext";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api";

// CONFIGURACIÓN DE REPORTES
const PDF_ENDPOINTS = {
    'variaciones': 'varianza',
    'no-contados': 'no-contados',
    'ubicaciones-pendientes': 'ubicaciones-pendientes',
    'valoracion': 'valoracion',
    'conteos': 'productos-contados'
};

const REPORTS_CONFIG = [
  {
    id: "variaciones",
    title: "Reporte de Variaciones",
    desc: "Discrepancias entre conteo físico y sistema.",
    icon: FileWarning,
    color: "#ef4444",
    endpoint: "variaciones",
    defaultCols: ["codigo_producto", "descripcion", "cantidad_sistema", "cantidad_final", "diferencia"],
    optionalCols: ["area", "ubicacion", "costo", "nombre_verificador", "es_forzado"],
    hasPdf: true
  },
  {
    id: "no_contados",
    title: "Códigos No Contados",
    desc: "Productos del sistema que no se encontraron físicamente.",
    icon: MapPinOff,
    color: "#f59e0b",
    endpoint: "no-contados",
    defaultCols: ["codigo_producto", "descripcion", "cantidad"],
    optionalCols: ["area", "ubicacion", "costo", "barcode", "categoria"],
    hasPdf: true // Activado
  },
  {
    id: "ubicaciones",
    title: "Ubicaciones Pendientes",
    desc: "Ubicaciones teóricas sin actividad de conteo.",
    icon: MapPinOff,
    color: "#3b82f6",
    endpoint: "ubicaciones-pendientes",
    defaultCols: ["ubicacion", "estado"],
    optionalCols: ["area"],
    hasPdf: true // Activado
  },
  {
    id: "valoracion",
    title: "KPI & Valoración",
    desc: "Precisión global (Accuracy) e impacto económico.",
    icon: TrendingUp,
    color: "#10b981",
    endpoint: "valoracion",
    defaultCols: ["metrica", "valor"],
    optionalCols: [],
    hasPdf: true // Activado
  },
  {
    id: "conteos",
    title: "Productos Contados",
    desc: "Descarga detallada de registros de la tabla conteos_part.",
    icon: CheckSquare,
    color: "#8b5cf6",
    endpoint: "conteos",
    defaultCols: ["codigo_producto", "descripcion", "categoria", "area", "ubicacion", "cantidad"],
    optionalCols: ["marbete", "nombre_contador", "fecha_escaneo"],
    hasPdf: true
  }
];

const useSheetJS = () => {
  const [libReady, setLibReady] = useState(false);
  useEffect(() => {
    if (window.XLSX) { setLibReady(true); return; }
    const script = document.createElement('script');
    script.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
    script.async = true;
    script.onload = () => setLibReady(true);
    document.body.appendChild(script);
  }, []);
  return libReady;
};

const Reports = () => {
  const { clients } = useClients();
  const libReady = useSheetJS();
  const toast = useToast();
  const { user } = useAuth();
  
  const [selectedClient, setSelectedClient] = useState("");
  const [activeReport, setActiveReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false); // Estado carga PDF
  const [selectedOptionals, setSelectedOptionals] = useState({});

  const toggleColumn = (col) => {
    setSelectedOptionals(prev => ({ ...prev, [col]: !prev[col] }));
  };

  // GENERAR EXCEL
  const handleGenerate = async () => {
    if (!selectedClient || !activeReport) return;
    setLoading(true);

    try {
        // CONSTRUCCIÓN DE PARÁMETROS CON AUDITORÍA
        const queryParams = new URLSearchParams({
            cliente_id: selectedClient,
            actor_id: user.id,       // Quién
            actor_name: user.nombre, // Nombre
            report_type: activeReport.title // Qué reporte (Metadata extra)
        }).toString();

        const res = await fetch(`${API_URL}/api/reportes/${activeReport.endpoint}?${queryParams}`);
        const result = await res.json();

        if (!res.ok) throw new Error(result.error);
        
        const reportData = result.data || [];
        if (reportData.length === 0) {
            toast.info("Sin datos para reportar."); 
            setLoading(false); return;
        }
        
        const finalCols = [...activeReport.defaultCols, ...activeReport.optionalCols.filter(c => selectedOptionals[c])];
        const exportData = reportData.map(row => {
            const newRow = {};
            finalCols.forEach(col => { newRow[col.toUpperCase()] = row[col] ?? ''; });
            return newRow;
        });

        if (window.XLSX) {
            const ws = window.XLSX.utils.json_to_sheet(exportData);
            const wb = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(wb, ws, "Reporte");
            const cName = clients.find(c => c.id === selectedClient)?.nombre || "C";
            window.XLSX.writeFile(wb, `reinnillo_${activeReport.id}_${cName}.xlsx`);
            setActiveReport(null);
        }
    } catch (err) { alert(err.message); } 
    finally { setLoading(false); }
  };

  // GENERAR PDF
   const handleGeneratePDF = async () => {
    if (!selectedClient || !activeReport) return;
    setPdfLoading(true);

    try {
      // Seleccionamos el endpoint correcto usando el mapa
      const pdfEndpoint = PDF_ENDPOINTS[activeReport.endpoint] || 'varianza';
      
      const response = await fetch(`${API_URL}/api/reportes/pdf/${pdfEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cliente_id: selectedClient,
          // Datos de auditoría
          admin_id: user.id,
          admin_name: user.nombre,
          admin_role: user.rol,
          report_type: activeReport.title,
          cliente_name: clients.find(c => c.id === Number(selectedClient))?.nombre || "N/A" 
        })
      });

      if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Error ${response.status}: El servidor rechazó la solicitud.`);
      }

      const blob = await response.blob();
      
      if (blob.size === 0) throw new Error("El archivo recibido está vacío.");

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_${activeReport.id}_${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      setActiveReport(null);

    } catch (err) {
      console.error(err);
      toast.error("⚠️ No se pudo generar el PDF:\n" + err.message);
    } finally {
      setPdfLoading(false);
    }
   };

  return (
    <div className="dashboard-container animate-fade-in" style={{ padding: '16px' }}>
      {/* HEADER */}
      <div style={{ marginBottom: '30px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent)', margin: 0 }}>
          <FileBarChart /> Centro de Reportes
        </h2>
        
        <div style={{ marginTop: '20px' }}>
            <label style={{color: '#8b949e', fontSize: '0.9rem', marginRight: '10px'}}>Cliente Objetivo:</label>
            <select 
                value={selectedClient} 
                onChange={(e) => setSelectedClient(e.target.value)}
                style={{ padding: '10px', borderRadius: '8px', background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)', minWidth: '250px' }}
            >
                <option value="">-- Seleccionar Cliente --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
        </div>
      </div>

      {/* GRID */}
      {!selectedClient ? (
          <div style={{ textAlign: 'center', padding: '50px', opacity: 0.5 }}>
              <Settings size={48} />
              <p>Seleccione un cliente para ver los reportes disponibles.</p>
          </div>
      ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {REPORTS_CONFIG.map(report => (
                <div 
                    key={report.id}
                    onClick={() => { setSelectedOptionals({}); setActiveReport(report); }}
                    style={{ 
                        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', 
                        padding: '25px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = report.color}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                    <div style={{ position: 'absolute', right: -10, top: -10, opacity: 0.1, transform: 'rotate(15deg)' }}>
                        <report.icon size={80} color={report.color} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                        <div style={{ background: `${report.color}20`, padding: '10px', borderRadius: '8px', color: report.color }}>
                            <report.icon size={24} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{report.title}</h3>
                    </div>
                    <p style={{ margin: 0, color: '#8b949e', fontSize: '0.9rem', lineHeight: '1.4' }}>{report.desc}</p>
                </div>
            ))}
          </div>
      )}

      {/* MODAL CONFIG */}
      {activeReport && (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.8)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)'
        }}>
            <div style={{
                background: 'var(--card)', width: '500px', borderRadius: '16px', 
                border: `1px solid ${activeReport.color}`, padding: '30px',
                boxShadow: `0 0 30px ${activeReport.color}20`
            }}>
                <h3 style={{ marginTop: 0, color: activeReport.color, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <activeReport.icon size={24} /> {activeReport.title}
                </h3>
                
                <p style={{ color: '#8b949e' }}>Configuración de exportación:</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '20px 0' }}>
                    {activeReport.defaultCols.map(col => (
                        <div key={col} style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.7 }}>
                            <CheckSquare size={18} color="var(--success)" />
                            <span style={{ textTransform: 'uppercase', fontSize: '0.8rem' }}>{col.replace('_', ' ')}</span>
                        </div>
                    ))}
                    {activeReport.optionalCols.map(col => (
                        <div 
                            key={col} 
                            onClick={() => toggleColumn(col)}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                                padding: '8px', borderRadius: '6px', background: selectedOptionals[col] ? 'rgba(255,255,255,0.1)' : 'transparent',
                                border: selectedOptionals[col] ? `1px solid ${activeReport.color}` : '1px solid transparent'
                            }}
                        >
                            <div style={{ width: '18px', height: '18px', border: `2px solid ${selectedOptionals[col] ? activeReport.color : '#8b949e'}`, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {selectedOptionals[col] && <div style={{ width: '10px', height: '10px', background: activeReport.color, borderRadius: '2px' }} />}
                            </div>
                            <span style={{ textTransform: 'uppercase', fontSize: '0.8rem', color: selectedOptionals[col] ? 'var(--fg)' : '#8b949e' }}>
                                {col.replace('_', ' ')}
                            </span>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                    <button onClick={() => setActiveReport(null)} className="pda-btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                    
                    {/* BOTÓN EXCEL */}
                    <button onClick={handleGenerate} disabled={loading || pdfLoading} className="pda-btn-primary" style={{ flex: 2, background: activeReport.color, color: '#000' }}>
                        {loading ? <Loader2 className="animate-spin" /> : <Download size={18} />} EXCEL
                    </button>

                    {/* BOTÓN PDF (Solo si el reporte lo soporta) */}
                    {activeReport.hasPdf && (
                        <button 
                            onClick={handleGeneratePDF} 
                            disabled={loading || pdfLoading} 
                            className="pda-btn-primary" 
                            style={{ flex: 2, background: 'var(--fg)', color: 'var(--bg)', border: '1px solid var(--border)' }}
                            title="Generar PDF Oficial"
                        >
                            {pdfLoading ? <Loader2 className="animate-spin" /> : <Printer size={18} />} PDF
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Reports;