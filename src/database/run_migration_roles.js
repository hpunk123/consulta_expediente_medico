const pool = require('./database');

async function runMigration() {
  try {
    console.log('=== Migration: Catálogo de Roles ===');
    
    // Crear tabla de roles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tbl_roles (
        id_rol INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL UNIQUE,
        descripcion VARCHAR(100) DEFAULT NULL,
        activo TINYINT(1) DEFAULT 1,
        creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('Tabla tbl_roles creada correctamente');

    // Insertar catálogo de roles
    const roles = [
      { nombre: 'administrador', descripcion: 'Administrador del sistema' },
      { nombre: 'director', descripcion: 'Director' },
      { nombre: 'subdirector', descripcion: 'Subdirector' },
      { nombre: 'jefe_departamento', descripcion: 'Jefe de Departamento' },
      { nombre: 'supervisor', descripcion: 'Supervisor' },
      { nombre: 'evaluador', descripcion: 'Evaluador' }
    ];

    for (const rol of roles) {
      await pool.query(
        'INSERT IGNORE INTO tbl_roles (nombre, descripcion) VALUES (?, ?)',
        [rol.nombre, rol.descripcion]
      );
      console.log(`Rol '${rol.nombre}' insertado/verificado`);
    }

    // Verificar roles insertados
    const [rows] = await pool.query('SELECT * FROM tbl_roles WHERE activo = 1');
    console.log('\nRoles en catálogo:');
    rows.forEach(r => console.log(`  - ${r.id_rol}: ${r.nombre} (${r.descripcion})`));

    console.log('\nMigración completada');
    process.exit(0);
  } catch (error) {
    console.error('Error en migration:', error.message);
    process.exit(1);
  }
}

runMigration();
