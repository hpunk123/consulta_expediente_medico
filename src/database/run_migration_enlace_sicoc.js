const pool = require('./database');

async function runMigration() {
  try {
    console.log('Creando tabla tbl_enlace_sicoc...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tbl_enlace_sicoc (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_eval INT NOT NULL,
        evalConsecutivo VARCHAR(50) NULL,
        eActivo TINYINT(1) DEFAULT 1,
        creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        modificado TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_eval (id_eval),
        INDEX idx_activo (eActivo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('Tabla tbl_enlace_sicoc creada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('Error en migración:', error.message);
    process.exit(1);
  }
}

runMigration();