// frontend/src/components/Inventory/Inventory.jsx
import React from "react";
import { useAuth } from "../../context/AuthContext";
import AdminInventoryView from "./AdminInventoryView";
import CounterMetrics from "./CounterMetrics";

const Inventory = () => {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();

  if (role === 'admin' || role === 'supervisor') {
    return <AdminInventoryView />;
  }

  if (role === 'contador') {
    return <CounterMetrics />;
  }

  // Fallback seguro
  return (
    <div className="dashboard-container" style={{textAlign: 'center', padding: '50px', color: '#8b949e'}}>
      Acceso no definido para este rol.
    </div>
  );
};

export default Inventory;