import supabase from '../config/supabaseClient.js';
import bcrypt from 'bcryptjs';

// GET: Listar usuarios
export const getUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuarios_imc')
      .select('id, nombre, correo, role, cedula, telefono, fecha_registro, activo, user_type, cliente_id, ultimo_acceso')
      .order('fecha_registro', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ 
      count: data?.length || 0, 
      users: data || [] 
    });

  } catch (err) {
    console.error('Error SDK (GET):', err.message);
    return res.status(500).json({ error: 'Error obteniendo usuarios del sistema.' });
  }
};

// POST: Crear usuario
export const createUser = async (req, res) => {
  const { nombre, correo, cedula, password, telefono, role, user_type, activo } = req.body;

  if (!nombre || !correo || !cedula || !password) {
    return res.status(400).json({ error: 'Protocolo incompleto.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const pass_hash = await bcrypt.hash(password, salt);
    
    const validRoles = ['admin', 'supervisor', 'contador'];
    const userRole = (role && validRoles.includes(role)) ? role : 'contador';

    const { data, error } = await supabase
      .from('usuarios_imc')
      .insert([{ 
          nombre, correo, cedula, pass_hash, 
          telefono: telefono || null, 
          role: userRole,
          user_type: user_type || 'Fijo',
          activo: activo !== undefined ? activo : true,
          fecha_registro: new Date()
      }])
      .select('id, nombre, correo, role, cedula, telefono, fecha_registro, activo, user_type, cliente_id, ultimo_acceso')
      .single(); 

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Usuario ya existe.' });
      throw error;
    }

    return res.status(201).json({ message: 'Agente registrado.', user: data });

  } catch (err) {
    console.error('Error SDK (POST):', err.message);
    return res.status(500).json({ error: 'Fallo al crear usuario.' });
  }
};

// PUT: Actualizar Datos de Usuario
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Medida de seguridad: Prohibir la modificación de 'cliente_id' a través de este endpoint.
  // La asignación de clientes solo debe realizarse a través de la ruta de lote /assign-batch.
  if (updates.cliente_id !== undefined) {
    delete updates.cliente_id;
  }

  try {
    const { data, error } = await supabase
      .from('usuarios_imc')
      .update(updates)
      .eq('id', id)
      .select('id, nombre, correo, role, cedula, telefono, fecha_registro, activo, user_type, cliente_id, ultimo_acceso')
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    return res.status(200).json({ message: 'Usuario actualizado.', user: data });
  } catch (err) {
    console.error('Error SDK (PUT):', err.message);
    return res.status(500).json({ error: 'Fallo al actualizar usuario.' });
  }
};

// PUT: Actualización en Lote de Asignaciones de Cliente
export const updateUserAssignments = async (req, res) => {
  const { clientId, userIds } = req.body;

  if (clientId === undefined || !Array.isArray(userIds)) {
    return res.status(400).json({ error: 'Protocolo incompleto: Se requiere clientId y un array userIds.' });
  }

  try {
    // PASO 1: Limpiar todas las asignaciones existentes para este cliente.
    // Esto simplifica la lógica y previene errores con filtros complejos.
    const { error: unassignError } = await supabase
      .from('usuarios_imc')
      .update({ cliente_id: null })
      .eq('cliente_id', clientId);

    if (unassignError) throw { ...unassignError, step: 'unassign-all' };

    // PASO 2: Asignar el nuevo conjunto de usuarios. Si el array está vacío, no hace nada.
    if (userIds.length > 0) {
      const { error: assignError } = await supabase
        .from('usuarios_imc')
        .update({ cliente_id: clientId })
        .in('id', userIds);
      
      if (assignError) throw { ...assignError, step: 'assign-new-set' };
    }

    return res.status(200).json({ message: `Equipo del cliente actualizado correctamente.` });

  } catch (err) {
    console.error(`Error SDK (Batch Assign) en paso "${err.step || 'unknown'}":`, err.message);
    return res.status(500).json({ error: `Fallo al actualizar las asignaciones del equipo (paso: ${err.step}).` });
  }
};