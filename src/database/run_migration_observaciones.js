const poolHC = require('./expedienteMedicoDatabase');

async function createObservaciones() {
  try {
    console.log('=== Migration: crear tabla tbl_observaciones_antecedentes ===');

    await poolHC.query(`
      CREATE TABLE IF NOT EXISTS tbl_observaciones_antecedentes (
        id_observacion INT AUTO_INCREMENT PRIMARY KEY,
        id_eval INT NOT NULL,
        seccion ENUM('heredo', 'nopat', 'accidentes', 'patologicos', 'sexual') NOT NULL,
        contenido TEXT,
        activo TINYINT(1) DEFAULT 1,
        creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modificado TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_eval_seccion (id_eval, seccion)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('Tabla tbl_observaciones_antecedentes creada/verificada');

    console.log('\nMigración completada');
    process.exit(0);
  } catch (error) {
    console.error('Error en migration:', error.message);
    process.exit(1);
  }
}

createObservaciones();
