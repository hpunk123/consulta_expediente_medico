const express = require('express');
const router = express.Router();
const { isNotLoggedIn } = require('../lib/auth');
const authController = require('../controllers/authController');

// GET /login
router.get('/login', isNotLoggedIn, authController.showLogin);

// POST /login
router.post('/login', isNotLoggedIn, authController.login);

// GET /logout
router.get('/logout', authController.logout);

module.exports = router;
