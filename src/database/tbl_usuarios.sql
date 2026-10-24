CREATE DATABASE IF NOT EXISTS consulta_expediente;

USE consulta_expediente;

CREATE TABLE IF NOT EXISTS tbl_usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    rol ENUM('administrador', 'director', 'supervisor', 'evaluador') NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Usuario administrador por defecto (password: admin123)
INSERT INTO tbl_usuarios (username, password, nombre, rol) 
VALUES ('admin', '$2a$10$XFE/UQEHkPKQSaRjpgXKwuGzQE9VN0MI8C5KFBFT0GO6MHlLP.maW', 'Administrador', 'administrador')
ON DUPLICATE KEY UPDATE username = username;
