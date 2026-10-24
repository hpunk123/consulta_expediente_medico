CREATE TABLE IF NOT EXISTS tbl_exploracion_fisica (
    id_exploracion_fisica INT AUTO_INCREMENT PRIMARY KEY,
    id_eval INT NOT NULL,
    cardiorespiratorio TINYINT(1) DEFAULT 0,
    cardiorespiratorio_obs TEXT DEFAULT NULL,
    endocrino TINYINT(1) DEFAULT 0,
    endocrino_obs TEXT DEFAULT NULL,
    osteomuscular TINYINT(1) DEFAULT 0,
    osteomuscular_obs TEXT DEFAULT NULL,
    neuropsiquiatrico TINYINT(1) DEFAULT 0,
    neuropsiquiatrico_obs TEXT DEFAULT NULL,
    otros TINYINT(1) DEFAULT 0,
    otros_obs TEXT DEFAULT NULL,
    sin_datos TINYINT(1) DEFAULT 0,
    creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modificado TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    activo TINYINT(1) DEFAULT 1,
    KEY idx_id_eval (id_eval)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
