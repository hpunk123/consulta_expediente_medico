const passport = require('passport');

const authController = {
  /**
   * Mostrar página de login
   */
  showLogin(req, res) {
    res.render('auth/login');
  },

  /**
   * Autenticar usuario
   */
  login(req, res, next) {
    passport.authenticate('local', {
      successRedirect: '/consulta',
      failureRedirect: '/login',
      failureFlash: true
    })(req, res, next);
  },

  /**
   * Cerrar sesión
   */
  logout(req, res) {
    req.logOut((err) => {
      if (err) {
        console.error('Error al cerrar sesión:', err);
      }
      req.flash('success_msg', 'Sesión cerrada correctamente');
      res.redirect('/login');
    });
  }
};

module.exports = authController;
