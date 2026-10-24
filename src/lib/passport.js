const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const pool = require('../database/database');

module.exports = function(passport) {
  // Local Strategy
  passport.use(new LocalStrategy({ usernameField: 'username' }, async (username, password, done) => {
    try {
      // Find user
      const users = await pool.query(
        'SELECT * FROM tbl_usuarios WHERE username = ? AND activo = 1',
        [username]
      );
      
      if (users.length === 0) {
        return done(null, false, { message: 'Usuario no encontrado' });
      }
      
      const user = users[0];
      
      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: 'Contraseña incorrecta' });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
  
  // Serialize user
  passport.serializeUser((user, done) => {
    done(null, user.id_usuario);
  });
  
  // Deserialize user
  passport.deserializeUser(async (id, done) => {
    try {
      const users = await pool.query(`
        SELECT u.*, r.nombre as rol_nombre, r.descripcion as rol_descripcion
        FROM tbl_usuarios u
        LEFT JOIN tbl_roles r ON u.id_rol = r.id_rol
        WHERE u.id_usuario = ?
      `, [id]);
      done(null, users[0]);
    } catch (error) {
      done(error);
    }
  });
};
