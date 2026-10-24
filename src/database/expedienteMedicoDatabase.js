const mysql = require('mysql');
const { database } = require('./expedienteMedicoKeys');
const { promisify } = require('util');

const pool = mysql.createPool(database);

pool.getConnection((err, connection) => {
  if (err) {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Se perdió la conexión con la base de datos historia_clinica_db');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
      console.error('Hay demasiadas conexiones a la base de datos historia_clinica_db');
    }
    if (err.code === 'ECONNREFUSED') {
      console.error('La conexión fue rechazada historia_clinica_db');
    }
  }
  if (connection) {
    connection.query("SET SESSION sql_mode = 'IGNORE_SPACE,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'", (err) => {
      if (err) console.error('Error setting sql_mode:', err.message);
      connection.release();
    });
  }
  console.log('Conexión exitosa historia_clinica_db');
});

pool.query = promisify(pool.query);
module.exports = pool;
