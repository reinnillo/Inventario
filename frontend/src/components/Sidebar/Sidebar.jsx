// src/components/Sidebar/Sidebar.jsx
import React from "react";
import { 
  LayoutDashboard, Box, Users, Activity, 
  Building2, Ticket, Lock, X 
} from "lucide-react";
import { useNavigation } from "../../context/NavigationContext";
import { useAuth } from "../../context/AuthContext";

const Sidebar = ({ isOpen, onClose }) => {
  const { currentView, navigateTo } = useNavigation();
  const { user } = useAuth();

  const role = user?.role?.toLowerCase();

  // Navegación que cierra el menú automáticamente en móvil
  const handleNav = (view) => {
    navigateTo(view);
    if (onClose) onClose();
  };

  const getLinkClass = (viewName) => 
    `nav-link ${currentView === viewName ? "active" : ""}`;

  // Base del Sidebar con clase dinámica 'open' para móvil
  const sidebarClass = `sidebar ${isOpen ? 'open' : ''}`;

  // CONTENIDO SEGÚN ROL (Misma lógica, encapsulada)
  const renderMenu = () => {
    if (role === 'contador') {
        return (
            <>
                <div className={getLinkClass("dashboard")} onClick={() => handleNav("dashboard")}>
                    <LayoutDashboard size={20} /><span>Panel de Conteo</span>
                </div>
                <div className={getLinkClass("inventario")} onClick={() => handleNav("inventario")}>
                    <Box size={20} /><span>Inventario</span>
                </div>
            </>
        );
    }
    if (role === 'verificador') {
        return (
            <>
                <div className={getLinkClass("dashboard")} onClick={() => handleNav("dashboard")}>
                    <LayoutDashboard size={20} /><span>Verificación</span>
                </div>
                <div className={getLinkClass("inventario")} onClick={() => handleNav("inventario")}>
                    <Box size={20} /><span>Historial</span>
                </div>
            </>
        );
    }
    // Admin/Supervisor
    return (
        <>
            <div className={getLinkClass("dashboard")} onClick={() => handleNav("dashboard")}>
                <LayoutDashboard size={20} /><span>Dashboard</span>
            </div>
            <div className={getLinkClass("inventario")} onClick={() => handleNav("inventario")}>
                <Box size={20} /><span>Inventario</span>
            </div>
            <div className={getLinkClass("usuarios")} onClick={() => handleNav("usuarios")}>
                <Users size={20} /><span>Usuarios</span>
            </div>
            <div className={getLinkClass("clientes")} onClick={() => handleNav("clientes")}>
                <Building2 size={20} /><span>Clientes</span>
            </div>
            <div className={getLinkClass("reportes")} onClick={() => handleNav("reportes")}>
                <Activity size={20} /><span>Reportes</span>
            </div>
        </>
    );
  };

  return (
    <aside className={sidebarClass}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '50px'}}>
        <div className="brand">
            <Activity size={28} />
            <span>{role === 'contador' ? 'reinnillo: PDA' : role === 'verificador' ? 'reinnillo: AUDIT' : 'reinnillo'}</span>
        </div>
        {/* Botón X solo visible en móvil si se ajusta CSS o se deja funcional */}
        <button 
            onClick={onClose} 
            style={{background:'none', border:'none', color:'var(--fg)', display: isOpen ? 'block' : 'none', cursor:'pointer'}}
        >
            <X size={24} />
        </button>
      </div>
      
      <nav className="nav-container">
        {renderMenu()}
      </nav>
    </aside>
  );
};

export default Sidebar;