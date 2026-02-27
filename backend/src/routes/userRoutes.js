// backend/src/routes/userRoutes.js
import express from 'express';
import { createUser, getUsers, updateUser, updateUserAssignments } from '../controllers/userController.js';

const router = express.Router();

// Rutas para Gestión de Usuarios
// Endpoint base: /api/usuarios_reinnillo

router.get('/usuarios_reinnillo', getUsers);        // Obtener lista
router.post('/usuarios_reinnillo', createUser);     // Crear usuario
router.put('/usuarios_reinnillo/assign-batch', updateUserAssignments); // Asignación en lote
router.put('/usuarios_reinnillo/:id', updateUser);  // Actualizar datos generales de un usuario

export default router;