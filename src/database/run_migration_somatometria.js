const poolHC = require('./expedienteMedicoDatabase');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('=== Migration: tbl_somatometria ===');
    
    const sqlPath = path.join(__dirname, 'tbl_somatometria.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await poolHC.query(sql);
    
    console.log('Tabla tbl_somatometria creada/verificada correctamente');
    process.exit(0);
  } catch (error) {
    console.error('Error en migration:', error.message);
    process.exit(1);
  }
}

runMigration();
