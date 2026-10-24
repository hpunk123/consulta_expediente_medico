const pool = require('../database/database');

class Parametro {
  /**
   * Obtener valor de un parámetro por clave
   * @param {string} clave
   * @returns {string|null} Valor del parámetro
   */
  static async getValor(clave) {
    const [param] = await pool.query(
      'SELECT valor FROM tbl_parametros WHERE clave = ? AND activo = 1',
      [clave]
    );
    return param ? param.valor : null;
  }

  /**
   * Obtener todos los parámetros activos
   * @returns {Array} Lista de parámetros
   */
  static async findAll() {
    return await pool.query(
      'SELECT id_parametro, clave, valor, descripcion, modificado FROM tbl_parametros WHERE activo = 1 ORDER BY clave'
    );
  }

  /**
   * Obtener parámetro por clave
   * @param {string} clave
   * @returns {Object} Parámetro
   */
  static async findByClave(clave) {
    const [param] = await pool.query(
      'SELECT * FROM tbl_parametros WHERE clave = ? AND activo = 1',
      [clave]
    );
    return param;
  }

  /**
   * Crear o actualizar parámetro
   * @param {string} clave
   * @param {string} valor
   * @param {string} descripcion
   * @returns {Object} Resultado
   */
  static async setValor(clave, valor, descripcion = null) {
    const existing = await this.findByClave(clave);

    if (existing) {
      return await pool.query(
        'UPDATE tbl_parametros SET valor = ?, modificado = NOW() WHERE clave = ?',
        [valor, clave]
      );
    } else {
      return await pool.query(
        'INSERT INTO tbl_parametros (clave, valor, descripcion) VALUES (?, ?, ?)',
        [clave, valor, descripcion]
      );
    }
  }

  /**
   * Eliminar parámetro (soft delete)
   * @param {string} clave
   * @returns {Object} Resultado
   */
  static async delete(clave) {
    return await pool.query(
      'UPDATE tbl_parametros SET activo = 0 WHERE clave = ?',
      [clave]
    );
  }
}

module.exports = Parametro;
