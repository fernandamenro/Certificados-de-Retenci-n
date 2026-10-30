const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const config = require('../config');
const authMiddleware = require('../middleware/auth');

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Debe ingresar usuario y contraseña.' });
  }

  const user = db.getUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );

  res.json({
    message: 'Inicio de sesión exitoso.',
    token,
    user: {
      username: user.username,
      role: user.role
    }
  });
});

/**
 * GET /api/auth/verify
 */
router.get('/verify', authMiddleware, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

module.exports = router;
