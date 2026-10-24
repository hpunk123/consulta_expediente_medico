const pool = require('./database');

async function createParametros() {
  try {
    console.log('=== Migration: crear tabla tbl_parametros ===');

    await pool.query('USE consulta_expediente');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tbl_parametros (
        id_parametro INT AUTO_INCREMENT PRIMARY KEY,
        clave VARCHAR(100) UNIQUE NOT NULL,
        valor TEXT NOT NULL,
        descripcion VARCHAR(255),
        activo TINYINT(1) DEFAULT 1,
        creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modificado TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('Tabla tbl_parametros creada/verificada');

    const existing = await pool.query(
      'SELECT id_parametro FROM tbl_parametros WHERE clave = ?',
      ['ruta_documentos']
    );

    if (existing.length === 0) {
      await pool.query(
        'INSERT INTO tbl_parametros (clave, valor, descripcion) VALUES (?, ?, ?)',
        ['ruta_documentos', String.raw`D:\Dev\cdmx\vLife\V3\vLifeProduction\src\public\uploads`, 'Ruta donde se almacenan los documentos PDF medicos']
      );
      console.log('Parametro ruta_documentos insertado');
    } else {
      console.log('Parametro ruta_documentos ya existe');
    }

    console.log('\nMigración completada');
    process.exit(0);
  } catch (error) {
    console.error('Error en migration:', error.message);
    process.exit(1);
  }
}

createParametros();
