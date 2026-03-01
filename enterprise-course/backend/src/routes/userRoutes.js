const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../config/database');

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.session.userId || req.user.id;
    const result = await db.query(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario nao encontrado'
      });
    }

    const user = result.rows[0];
    return res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar perfil'
    });
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.session.userId || req.user.id;
    const { name, email } = req.body;

    const current = await db.query(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );

    if (current.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario nao encontrado'
      });
    }

    const updated = await db.query(
      `UPDATE users
       SET name = COALESCE($2, name),
           email = COALESCE($3, email),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, role, created_at`,
      [userId, name || null, email || null]
    );

    const user = updated.rows[0];
    req.session.userName = user.name;
    req.session.userEmail = user.email;
    req.session.role = user.role;

    return res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar perfil'
    });
  }
});

module.exports = router;
