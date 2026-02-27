// src/components/Login/Login.jsx
import React, { useState } from "react";
import { Lock, Mail, Loader2, KeyRound, Activity, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../config/api";

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({ correo: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();

  // actualizacion de email y password
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          correo: formData.correo, 
          password: formData.password,
          // envio de datos para auditoria de login
          user_id: login.id,
          user_name: login.nombre,
          user_role: login.role
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error de acceso");

      // Éxito: El contexto global recibirá el usuario con su rol real
      onLogin(data.user);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-overlay">
        
        {/* TARJETA DE ACCESO CENTRALIZADA */}
        <div className="login-card" style={{ borderTop: '4px solid var(--accent)', width: '100%', maxWidth: '420px', padding: '50px 40px' }}>
          
          {/* Branding */}
          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <div style={{ 
              width: '70px', height: '70px', background: 'rgba(0, 224, 255, 0.1)', 
              borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
              border: '1px solid var(--accent)'
            }}>
              <Activity size={36} color="var(--accent)" />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--fg)', letterSpacing: '1px' }}>
              reinnillo ACCESS
            </h1>
            <p style={{ margin: '10px 0 0 0', fontSize: '0.9rem', color: '#8b949e' }}>
              Plataforma de Auditoría & Control
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: 15, top: 14, color: '#8b949e' }} />
              <input 
                type="email" 
                placeholder="Correo Corporativo"
                value={formData.correo}
                onChange={(e) => setFormData({...formData, correo: e.target.value})}
                required
                style={inputStyle}
              />
            </div>
            
            <div style={{ position: 'relative' }}>
              <KeyRound size={18} style={{ position: 'absolute', left: 15, top: 14, color: '#8b949e' }} />
              <input 
                type="password" 
                placeholder="Llave de Acceso"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                style={inputStyle}
              />
            </div>

            {error && (
                <div style={{ 
                    color: '#ef4444', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', 
                    padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                    <ShieldCheck size={16} />
                    {error}
                </div>
            )}

            <button 
                type="submit" 
                disabled={loading} 
                className="role-btn" 
                style={{ 
                    background: 'var(--accent)', color: '#000', fontWeight: 'bold', 
                    textAlign: 'center', justifyContent: 'center', display: 'flex', gap: '10px',
                    marginTop: '10px', padding: '15px', fontSize: '1rem'
                }}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "INICIAR SESIÓN"}
            </button>
          </form>

          <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '0.75rem', color: '#6b7280' }}>
            Sistema protegido. Acceso exclusivo para personal autorizado.
          </div>
        </div>

      </div>
    </div>
  );
};

const inputStyle = {
  width: '100%',
  padding: '14px 14px 14px 45px', // Padding izquierdo para el icono
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid var(--border)',
  color: 'var(--fg)',
  borderRadius: '8px',
  outline: 'none',
  fontSize: '0.95rem',
  transition: 'border-color 0.2s'
};

export default Login;