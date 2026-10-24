const pool = require('./database');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('=== Migration: crear tabla tbl_usuarios ===');
    
    // Create database
    await pool.query('CREATE DATABASE IF NOT EXISTS consulta_expediente');
    console.log('Base de datos consulta_expediente creada/verificada');
    
    // Use database
    await pool.query('USE consulta_expediente');
    
    // Create table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tbl_usuarios (
        id_usuario INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        rol ENUM('administrador', 'director', 'supervisor', 'evaluador') NOT NULL,
        activo TINYINT(1) DEFAULT 1,
        creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('Tabla tbl_usuarios creada/verificada');
    
    // Check if admin exists
    const existingAdmin = await pool.query(
      'SELECT id_usuario FROM tbl_usuarios WHERE username = ?',
      ['admin']
    );
    
    if (existingAdmin.length === 0) {
      // Create default admin
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO tbl_usuarios (username, password, nombre, rol) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'Administrador', 'administrador']
      );
      console.log('Usuario administrador creado (admin/admin123)');
    } else {
      console.log('Usuario administrador ya existe');
    }
    
    console.log('\nMigración completada');
    process.exit(0);
  } catch (error) {
    console.error('Error en migration:', error.message);
    process.exit(1);
  }
}

runMigration();
