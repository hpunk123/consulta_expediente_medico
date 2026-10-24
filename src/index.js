const express = require('express');
const exphbs = require('express-handlebars');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const path = require('path');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Passport config
require('./lib/passport')(passport);

// Handlebars helpers
const hbs = exphbs.create({
  defaultLayout: 'main',
  extname: '.hbs',
  helpers: {
    eq: (a, b) => a === b,
    or: function() {
      return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
    },
    json: (context) => JSON.stringify(context),
    formatDate: (date) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString('es-MX');
    },
    tamanoACm: (tamano) => {
      const map = {
        'PEQUEÑO': '<10 cm',
        'MEDIANO': '10-20 cm',
        'GRANDE': '20-40 cm',
        'MUY_GRANDE': '>40 cm'
      };
      return map[tamano] || tamano || '-';
    }
  }
});

// View engine
app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

// Body parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
  secret: 'consulta_expediente_cecc_2026',
  resave: false,
  saveUninitialized: false
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash messages
app.use(flash());

// Global variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

// Routes
app.use('/', require('./routes/auth'));
app.use('/consulta', require('./routes/consulta'));
app.use('/admin', require('./routes/admin'));

// Home redirect
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/consulta');
  } else {
    res.redirect('/login');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});
