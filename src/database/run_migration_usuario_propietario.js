const poolHC = require('./expedienteMedicoDatabase');

const tablas = [
  'tbl_datos_generales',
  'tbl_antecedentes_heredo',
  'tbl_antecedentes_no_patologicos',
  'tbl_accidentes_laborales',
  'tbl_antecedentes_patologicos',
  'tbl_salud_sexual',
  'tbl_observaciones_antecedentes',
  'tbl_exploracion_fisica',
  'tbl_somatometria',
  'tbl_documentos_medicos',
  'tbl_tatuajes_detalle'
];

async function runMigration() {
  try {
    console.log('=== Migration: Agregar id_usuario a tablas de expediente ===');
    
    for (const tabla of tablas) {
      try {
        await poolHC.query(`ALTER TABLE ${tabla} ADD COLUMN id_usuario INT DEFAULT NULL`);
        console.log(`Columna id_usuario agregada a ${tabla}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`Columna id_usuario ya existe en ${tabla}`);
        } else {
          console.error(`Error en ${tabla}:`, error.message);
        }
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
