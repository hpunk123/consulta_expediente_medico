const poolHC = require('./expedienteMedicoDatabase');

async function runMigration() {
  try {
    console.log('=== Migration: Agregar id_responsable a tbl_expediente_finalizado ===');
    
    try {
      await poolHC.query('ALTER TABLE tbl_expediente_finalizado ADD COLUMN id_responsable INT DEFAULT NULL');
      console.log('Columna id_responsable agregada a tbl_expediente_finalizado');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('Columna id_responsable ya existe en tbl_expediente_finalizado');
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
