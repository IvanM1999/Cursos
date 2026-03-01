const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const brain = require('../brain/EnterpriseBrain');
const db = require('../config/database');

router.post('/signup', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, name } = req.body;
    const existing = await db.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    if (existing.rowCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email ja registrado'
      });
    }

    const id = crypto.randomUUID();
    const role = email === process.env.ADMIN_EMAIL ? 'admin' : 'user';
    const passwordHash = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users (id, email, name, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, email, name, passwordHash, role]
    );

    brain.logAction('user.created', { userId: id, email });

    return res.status(201).json({
      success: true,
      message: 'Usuario criado com sucesso',
      data: { id, email, name, role }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao criar usuario'
    });
  }
});

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    await brain.processLogin({ email, password });

    const result = await db.query(
      `SELECT id, email, name, role, password_hash
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha invalidos'
      });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha invalidos'
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET missing');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.userEmail = user.email;
    req.session.role = user.role;

    return res.json({
      success: true,
      message: 'Login realizado com sucesso',
      token,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao fazer login'
    });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao fazer logout'
      });
    }

    return res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  });
});

router.get('/verify', (req, res) => {
  if (req.session.userId) {
    return res.json({
      success: true,
      authenticated: true,
      data: {
        id: req.session.userId,
        email: req.session.userEmail,
        name: req.session.userName,
        role: req.session.role || 'user'
      }
    });
  }

  return res.json({
    success: true,
    authenticated: false
  });
});

module.exports = router;
