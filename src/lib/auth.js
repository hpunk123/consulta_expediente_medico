module.exports = {
  // Check if user is authenticated
  isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    req.flash('error_msg', 'Debe iniciar sesión para acceder');
    res.redirect('/login');
  },
  
  // Check user role
  checkRole(roles) {
    return (req, res, next) => {
      if (!req.isAuthenticated()) {
        req.flash('error_msg', 'Debe iniciar sesión para acceder');
        return res.redirect('/login');
      }
      
      // Usar rol_nombre del join con tbl_roles
      const userRole = req.user.rol_nombre;
      if (roles.includes(userRole)) {
        return next();
      }
      
      req.flash('error_msg', 'No tiene permisos para realizar esta acción');
      res.redirect('/consulta');
    };
  },
  
  // Redirect if already logged in
  isNotLoggedIn(req, res, next) {
    if (!req.isAuthenticated()) {
      return next();
    }
    res.redirect('/consulta');
  }
};
