const poolHC = require('./expedienteMedicoDatabase');

async function runMigration() {
  try {
    console.log('=== Migration: Agregar horas_sueno a tbl_antecedentes_no_patologicos ===');

    try {
      await poolHC.query('ALTER TABLE tbl_antecedentes_no_patologicos ADD COLUMN horas_sueno INT DEFAULT NULL');
      console.log('Columna horas_sueno agregada a tbl_antecedentes_no_patologicos');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('Columna horas_sueno ya existe en tbl_antecedentes_no_patologicos');
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
