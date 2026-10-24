const poolHC = require('./expedienteMedicoDatabase');

async function runMigration() {
  try {
    console.log('=== Migration: Antecedentes Patológicos Adicionales ===\n');

    const columns = [
      { name: 'ant_traumatologico', type: 'TINYINT(1) DEFAULT 0' },
      { name: 'ant_traumatologico_obs', type: 'TEXT' },
      { name: 'ant_medicamentos_controlados', type: 'TINYINT(1) DEFAULT 0' },
      { name: 'ant_medicamentos_controlados_obs', type: 'TEXT' },
      { name: 'ant_cardiorespiratorias', type: 'TINYINT(1) DEFAULT 0' },
      { name: 'ant_cardiorespiratorias_obs', type: 'TEXT' },
      { name: 'ant_endocrinologicas', type: 'TINYINT(1) DEFAULT 0' },
      { name: 'ant_endocrinologicas_obs', type: 'TEXT' },
      { name: 'ant_musculo_esqueleticas', type: 'TINYINT(1) DEFAULT 0' },
      { name: 'ant_musculo_esqueleticas_obs', type: 'TEXT' },
      { name: 'ant_otros', type: 'TINYINT(1) DEFAULT 0' },
      { name: 'ant_otros_obs', type: 'TEXT' },
      { name: 'ant_ninguno', type: 'TINYINT(1) DEFAULT 0' }
    ];

    for (const col of columns) {
      try {
        await poolHC.query(`ALTER TABLE tbl_antecedentes_patologicos ADD COLUMN ${col.name} ${col.type}`);
        console.log(`  Columna ${col.name} agregada`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`  Columna ${col.name} ya existe`);
        } else {
          console.error(`  Error en ${col.name}: ${error.message}`);
        }
      }
    }

    console.log('\n=== MIGRACIÓN COMPLETADA ===');
    process.exit(0);
  } catch (error) {
    console.error('Error en migración:', error.message);
    process.exit(1);
  }
}

runMigration();