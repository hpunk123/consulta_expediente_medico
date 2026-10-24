const pool = require('./database');

async function runMigration() {
  try {
    console.log('=== Migration: Agregar clave a tbl_usuarios ===');
    
    try {
      await pool.query('ALTER TABLE tbl_usuarios ADD COLUMN clave VARCHAR(50) DEFAULT NULL AFTER nombre');
      console.log('Columna clave agregada a tbl_usuarios');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('Columna clave ya existe en tbl_usuarios');
      } else {
        throw error;
      }
    }

    console.log('\nMigración completada');
    process.exit(0);
  } catch (error) {
    console.error('Error en migration:', error.message);
    process.exit(1);
  }
}

runMigration();
