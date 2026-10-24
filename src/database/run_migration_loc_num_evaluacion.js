const poolHC = require('./expedienteMedicoDatabase');

async function runMigration() {
  try {
    console.log('Iniciando migración: loc_num_evaluacion en tbl_somatometria...');

    const result = await poolHC.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'tbl_somatometria' 
      AND COLUMN_NAME = 'loc_num_evaluacion'
    `);

    if (result.length === 0) {
      await poolHC.query('ALTER TABLE tbl_somatometria ADD COLUMN loc_num_evaluacion INT DEFAULT NULL AFTER loc_resultado');
      console.log('✅ Columna loc_num_evaluacion agregada exitosamente');
    } else {
      console.log('⚠️  La columna loc_num_evaluacion ya existe');
    }

    console.log('Migración completada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  }
}

runMigration();
