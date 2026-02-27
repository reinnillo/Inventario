// frontend/src/context/SystemUsersContext.jsx
import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { API_URL } from "../config/api";

const SystemUsersContext = createContext(null);

export const SystemUsersProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Carga Inicial
  const refreshUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/usuarios_reinnillo`);
      if (!res.ok) throw new Error("Fallo en enlace con Directorio");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error("Error SystemUsers:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshUsers(); }, []);

  // 2. Crear Usuario
  const addUser = async (userData) => {
    try {
      const res = await fetch(`${API_URL}/api/usuarios_reinnillo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      // Actualización local rápida
      setUsers(prev => [result.user, ...prev]);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // 3. Editar Usuario 
  const editUser = async (userId, updates) => {
    try {
      const res = await fetch(`${API_URL}/api/usuarios_reinnillo/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      // Actualización Optimista en Memoria
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...result.user } : u));
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // 4. Asignación en Lote
  const assignUsersToClientBatch = async (clientId, userIds) => {
    try {
      const res = await fetch(`${API_URL}/api/usuarios_reinnillo/assign-batch`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, userIds }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      // Refrescar toda la data para consistencia
      await refreshUsers(); 
      return { success: true, message: result.message };

    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Selectores
  const staffFijo = useMemo(() => users.filter(u => u.user_type === 'Fijo'), [users]);
  const staffTemporal = useMemo(() => users.filter(u => u.user_type !== 'Fijo'), [users]);

  const value = {
    users, 
    staffFijo,
    staffTemporal,
    loading,
    error,
    refreshUsers,
    addUser,
    editUser, // Exportamos la función genérica
    assignUsersToClientBatch, // Exportamos la nueva función
  };

  return (
    <SystemUsersContext.Provider value={value}>
      {children}
    </SystemUsersContext.Provider>
  );
};

export const useSystemUsers = () => {
  const context = useContext(SystemUsersContext);
  if (!context) throw new Error("useSystemUsers debe usarse dentro de SystemUsersProvider");
  return context;
};