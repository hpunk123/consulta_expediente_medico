const User = require('../models/User');

const adminController = {
  /**
   * Mostrar lista de usuarios
   */
  async showUsuarios(req, res) {
    try {
      const usuarios = await User.findAll();
      const roles = await User.getRoles();
      res.render('admin/usuarios', { usuarios, roles });
    } catch (error) {
      console.error('Error al cargar usuarios:', error.message);
      req.flash('error_msg', 'Error al cargar usuarios');
      res.redirect('/consulta');
    }
  },

  /**
   * Crear nuevo usuario
   */
  async createUsuario(req, res) {
    const { username, password, nombre, clave, id_rol } = req.body;

    if (!username || !password || !nombre || !id_rol) {
      req.flash('error_msg', 'Todos los campos son obligatorios');
      return res.redirect('/admin/usuarios');
    }

    try {
      const exists = await User.usernameExists(username);

      if (exists) {
        req.flash('error_msg', 'El nombre de usuario ya existe');
        return res.redirect('/admin/usuarios');
      }

      await User.create({ username, password, nombre, clave, id_rol: Number(id_rol) });

      req.flash('success_msg', 'Usuario creado correctamente');
      res.redirect('/admin/usuarios');
    } catch (error) {
      console.error('Error al crear usuario:', error.message);
      req.flash('error_msg', 'Error al crear usuario');
      res.redirect('/admin/usuarios');
    }
  },

  /**
   * Eliminar usuario (soft delete)
   */
  async deleteUsuario(req, res) {
    const { id } = req.params;

    try {
      await User.softDelete(id);

      req.flash('success_msg', 'Usuario eliminado correctamente');
      res.redirect('/admin/usuarios');
    } catch (error) {
      console.error('Error al eliminar usuario:', error.message);
      req.flash('error_msg', 'Error al eliminar usuario');
      res.redirect('/admin/usuarios');
    }
  },

  /**
   * Reactivar usuario
   */
  async reactivateUsuario(req, res) {
    const { id } = req.params;

    try {
      await User.reactivate(id);

      req.flash('success_msg', 'Usuario reactivado correctamente');
      res.redirect('/admin/usuarios');
    } catch (error) {
      console.error('Error al reactivar usuario:', error.message);
      req.flash('error_msg', 'Error al reactivar usuario');
      res.redirect('/admin/usuarios');
    }
  }
};

module.exports = adminController;
