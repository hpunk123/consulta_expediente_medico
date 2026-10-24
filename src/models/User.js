const pool = require('../database/database');
const bcrypt = require('bcryptjs');

class User {
  /**
   * Obtener todos los usuarios con nombre de rol
   * @returns {Array} Lista de usuarios
   */
  static async findAll() {
    return await pool.query(`
      SELECT u.id_usuario, u.username, u.nombre, u.clave, u.id_rol, 
             r.nombre as rol_nombre, r.descripcion as rol_descripcion,
             u.activo, u.creado 
      FROM tbl_usuarios u
      LEFT JOIN tbl_roles r ON u.id_rol = r.id_rol
      ORDER BY u.creado DESC
    `);
  }

  /**
   * Buscar usuario por ID
   * @param {number} id
   * @returns {Object} Usuario
   */
  static async findById(id) {
    const [user] = await pool.query(`
      SELECT u.id_usuario, u.username, u.nombre, u.clave, u.id_rol,
             r.nombre as rol_nombre, r.descripcion as rol_descripcion,
             u.activo 
      FROM tbl_usuarios u
      LEFT JOIN tbl_roles r ON u.id_rol = r.id_rol
      WHERE u.id_usuario = ?
    `, [id]);
    return user;
  }

  /**
   * Buscar usuario por username
   * @param {string} username
   * @returns {Object} Usuario con password
   */
  static async findByUsername(username) {
    const [user] = await pool.query(`
      SELECT u.*, r.nombre as rol_nombre, r.descripcion as rol_descripcion
      FROM tbl_usuarios u
      LEFT JOIN tbl_roles r ON u.id_rol = r.id_rol
      WHERE u.username = ?
    `, [username]);
    return user;
  }

  /**
   * Crear nuevo usuario
   * @param {Object} data - { username, password, nombre, clave, id_rol }
   * @returns {Object} Resultado de la inserción
   */
  static async create({ username, password, nombre, clave, id_rol }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return await pool.query(
      'INSERT INTO tbl_usuarios (username, password, nombre, clave, id_rol) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, nombre, clave || null, id_rol]
    );
  }

  /**
   * Verificar si el username ya existe
   * @param {string} username
   * @returns {boolean}
   */
  static async usernameExists(username) {
    const existing = await pool.query(
      'SELECT id_usuario FROM tbl_usuarios WHERE username = ?',
      [username]
    );
    return existing.length > 0;
  }

  /**
   * Soft delete usuario
   * @param {number} id
   * @returns {Object} Resultado
   */
  static async softDelete(id) {
    return await pool.query(
      'UPDATE tbl_usuarios SET activo = 0 WHERE id_usuario = ?',
      [id]
    );
  }

  /**
   * Reactivar usuario
   * @param {number} id
   * @returns {Object} Resultado
   */
  static async reactivate(id) {
    return await pool.query(
      'UPDATE tbl_usuarios SET activo = 1 WHERE id_usuario = ?',
      [id]
    );
  }

  /**
   * Obtener todos los roles activos
   * @returns {Array} Lista de roles
   */
  static async getRoles() {
    return await pool.query(
      'SELECT id_rol, nombre, descripcion FROM tbl_roles WHERE activo = 1 ORDER BY id_rol'
    );
  }

  /**
   * Obtener usuarios que pueden ser responsables (Director, Subdirector, Jefe de Departamento)
   * @returns {Array} Lista de usuarios responsables
   */
  static async getResponsables() {
    return await pool.query(`
      SELECT u.id_usuario, u.nombre, u.clave, r.nombre as rol_nombre
      FROM tbl_usuarios u
      INNER JOIN tbl_roles r ON u.id_rol = r.id_rol
      WHERE r.nombre IN ('director', 'subdirector', 'jefe_departamento')
        AND u.activo = 1
      ORDER BY r.nombre, u.nombre
    `);
  }
}

module.exports = User;
