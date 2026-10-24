const pool = require('./database');

async function runMigration() {
  try {
    console.log('=== Migration: Relacionar usuarios con catálogo de roles ===');
    
    // Agregar columna id_rol a tbl_usuarios
    try {
      await pool.query('ALTER TABLE tbl_usuarios ADD COLUMN id_rol INT DEFAULT NULL');
      console.log('Columna id_rol agregada a tbl_usuarios');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('Columna id_rol ya existe en tbl_usuarios');
      } else {
        throw error;
      }
    }

    // Actualizar usuarios existentes con el id_rol correspondiente
    const rolMapping = {
      'administrador': 1,
      'director': 2,
      'subdirector': 3,
      'jefe_departamento': 4,
      'supervisor': 5,
      'evaluador': 6
    };

    for (const [rolNombre, rolId] of Object.entries(rolMapping)) {
      const result = await pool.query(
        'UPDATE tbl_usuarios SET id_rol = ? WHERE rol = ? AND id_rol IS NULL',
        [rolId, rolNombre]
      );
      console.log(`Usuarios con rol '${rolNombre}' actualizados: ${result.affectedRows || 0}`);
    }

    // Verificar resultados
    const [users] = await pool.query(`
      SELECT u.id_usuario, u.username, u.nombre, u.rol, u.id_rol, r.nombre as rol_nombre
      FROM tbl_usuarios u
      LEFT JOIN tbl_roles r ON u.id_rol = r.id_rol
      WHERE u.activo = 1
    `);
    
    console.log('\nUsuarios actualizados:');
    users.forEach(u => {
      console.log(`  - ${u.username}: rol=${u.rol}, id_rol=${u.id_rol}, rol_nombre=${u.rol_nombre}`);
    });

    console.log('\nMigración completada');
    process.exit(0);
  } catch (error) {
    console.error('Error en migration:', error.message);
    process.exit(1);
  }
}

runMigration();
