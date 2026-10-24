const poolHC = require('./expedienteMedicoDatabase');
const Parametro = require('../models/Parametro');
const fs = require('fs');
const path = require('path');

const tablas = [
  'tbl_observaciones_antecedentes',
  'tbl_exploracion_fisica',
  'tbl_somatometria',
  'tbl_documentos_medicos',
  'tbl_tatuajes_detalle',
  'tbl_tatuajes',
  'tbl_salud_sexual',
  'tbl_antecedentes_patologicos',
  'tbl_accidentes_laborales',
  'tbl_antecedentes_no_patologicos',
  'tbl_antecedentes_heredo',
  'tbl_datos_generales',
  'tbl_expediente_finalizado'
];

async function runCleanup() {
  try {
    console.log('=== LIMPIEZA DE EXPEDIENTES PARA PRODUCCIÓN ===\n');

    // 1. Eliminar archivos PDF físicos
    console.log('--- Eliminando archivos PDF ---');
    try {
      const rutaDocumentos = await Parametro.getValor('ruta_documentos');
      if (rutaDocumentos && fs.existsSync(rutaDocumentos)) {
        const files = fs.readdirSync(rutaDocumentos);
        let deletedCount = 0;
        for (const file of files) {
          const filePath = path.join(rutaDocumentos, file);
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        }
        console.log(`  ${deletedCount} archivos eliminados de ${rutaDocumentos}`);
      } else {
        console.log('  Ruta de documentos no encontrada o no configurada');
      }
    } catch (error) {
      console.log(`  Error eliminando PDFs: ${error.message}`);
    }

    // 2. Limpiar tablas de BD
    console.log('\n--- Limpiando tablas de base de datos ---');
    await poolHC.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const tabla of tablas) {
      try {
        const [countResult] = await poolHC.query(`SELECT COUNT(*) as total FROM ${tabla}`);
        const total = countResult[0]?.total || 0;
        await poolHC.query(`TRUNCATE TABLE ${tabla}`);
        console.log(`  ${tabla}: ${total} registros eliminados`);
      } catch (error) {
        console.log(`  ${tabla}: Error - ${error.message}`);
      }
    }

    await poolHC.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n=== LIMPIEZA COMPLETADA ===');
    console.log('Tablas de catálogo y usuarios NO fueron afectadas.');
    process.exit(0);
  } catch (error) {
    console.error('Error en limpieza:', error.message);
    process.exit(1);
  }
}

runCleanup();
