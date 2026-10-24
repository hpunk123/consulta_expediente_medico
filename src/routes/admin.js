const express = require('express');
const router = express.Router();
const { isLoggedIn, checkRole } = require('../lib/auth');
const adminController = require('../controllers/adminController');

// GET /admin/usuarios - Lista de usuarios
router.get('/usuarios', isLoggedIn, checkRole(['administrador']), adminController.showUsuarios);

// POST /admin/usuarios - Crear usuario
router.post('/usuarios', isLoggedIn, checkRole(['administrador']), adminController.createUsuario);

// POST /admin/usuarios/:id/eliminar - Eliminar usuario (soft delete)
router.post('/usuarios/:id/eliminar', isLoggedIn, checkRole(['administrador']), adminController.deleteUsuario);

// POST /admin/usuarios/:id/reactivar - Reactivar usuario
router.post('/usuarios/:id/reactivar', isLoggedIn, checkRole(['administrador']), adminController.reactivateUsuario);

module.exports = router;
