const mysql = require('mysql');

// Connect without specifying database
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: ''
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting:', err.message);
    process.exit(1);
  }
  
  console.log('Connected to MySQL');
  
  connection.query('CREATE DATABASE IF NOT EXISTS consulta_expediente', (err) => {
    if (err) {
      console.error('Error creating database:', err.message);
    } else {
      console.log('Database consulta_expediente created/verified');
    }
    
    connection.end();
    process.exit(0);
  });
});
