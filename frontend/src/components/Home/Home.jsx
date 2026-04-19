// frontend/src/components/Home/Home.jsx
import React, { useState } from "react";
import { LayoutDashboard, Calculator } from "lucide-react";
import AdminDashboard from "../Dashboard/AdminDashboard";
import CounterDashboard from "../../module/contador/CounterDashboard";
import CountingSupervision from "../Supervision/CountingSupervision";
import { useAuth } from "../../context/AuthContext";

const Home = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  const currentRole = user?.role?.toLowerCase();
  const isAdminOrSuper = currentRole === "admin" || currentRole === "supervisor";

  const renderRightPanel = () => {
    // CASO 1: ADMINS Y SUPERVISORES
    if (isAdminOrSuper) {
      switch (activeTab) {
        case "dashboard": return <AdminDashboard />;
        case "conteo":    return <CountingSupervision />;
        default:          return <AdminDashboard />;
      }
    }

    // CASO 2: CONTADORES (incluye ex-verificadores migrados)
    if (currentRole === "contador") {
      return <CounterDashboard />;
    }

    // CASO 3: ACCESO DENEGADO
    return (
      <div className="dashboard-placeholder" style={{border: '1px solid red'}}>
        <h3>Acceso No Autorizado</h3>
        <p>Rol detectado: {user?.role || 'Ninguno'}</p>
      </div>
    );
  };

  return (
    <div className="home-container">
      <section className="home-right" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%' }}>

        {isAdminOrSuper && (
          <nav className="admin-tabs">
            <button className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
              <LayoutDashboard size={16} /> Dashboard
            </button>
            <button className={`tab-btn ${activeTab === 'conteo' ? 'active' : ''}`} onClick={() => setActiveTab('conteo')}>
              <Calculator size={16} /> Supervisión Conteo
            </button>
          </nav>
        )}

        {renderRightPanel()}
      </section>
    </div>
  );
};

export default Home;