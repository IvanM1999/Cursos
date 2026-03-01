const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const brain = require('../brain/EnterpriseBrain');
const db = require('../config/database');

function mapBlogRow(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    tags: Array.isArray(row.tags) ? row.tags : [],
    status: row.status,
    views: row.views,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, title, content, category, tags, status, views, created_by, created_at, updated_at
       FROM blogs
       WHERE status = 'published'
       ORDER BY created_at DESC`
    );

    const blogs = result.rows.map(mapBlogRow);
    return res.json({
      success: true,
      data: blogs,
      total: blogs.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar blogs'
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, title, content, category, tags, status, views, created_by, created_at, updated_at
       FROM blogs
       WHERE id = $1
       LIMIT 1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blog nao encontrado'
      });
    }

    const blog = result.rows[0];
    const requesterId = req.session.userId || req.user?.id;
    const isOwner = requesterId && requesterId === blog.created_by;

    if (blog.status !== 'published' && !isOwner) {
      return res.status(404).json({
        success: false,
        message: 'Blog nao encontrado'
      });
    }

    await db.query('UPDATE blogs SET views = views + 1 WHERE id = $1', [req.params.id]);
    blog.views += 1;

    return res.json({
      success: true,
      data: mapBlogRow(blog)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar blog'
    });
  }
});

router.post('/', authMiddleware, [
  body('title').notEmpty().isLength({ min: 5 }),
  body('content').notEmpty().isLength({ min: 20 }),
  body('category').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.session.userId || req.user.id;
    const { title, content, category, tags = [] } = req.body;

    const processedBlog = await brain.processBlogCreation(
      { title, content, category, tags },
      userId
    );

    const id = crypto.randomUUID();
    const status = req.body.status === 'published' ? 'published' : processedBlog.status || 'draft';

    const insert = await db.query(
      `INSERT INTO blogs (id, title, content, category, tags, status, views, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, 0, $7, NOW(), NOW())
       RETURNING id, title, content, category, tags, status, views, created_by, created_at, updated_at`,
      [id, processedBlog.title, processedBlog.content, processedBlog.category, JSON.stringify(processedBlog.tags || []), status, userId]
    );

    return res.status(201).json({
      success: true,
      message: 'Blog criado com sucesso',
      data: mapBlogRow(insert.rows[0])
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao criar blog'
    });
  }
});

router.put('/:id', authMiddleware, [
  body('title').optional().isLength({ min: 5 }),
  body('content').optional().isLength({ min: 20 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.session.userId || req.user.id;
    const existing = await db.query(
      'SELECT id, created_by FROM blogs WHERE id = $1 LIMIT 1',
      [req.params.id]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blog nao encontrado'
      });
    }

    if (existing.rows[0].created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Voce nao tem permissao para editar este blog'
      });
    }

    const { title, content, category, tags, status } = req.body;
    const updated = await db.query(
      `UPDATE blogs
       SET title = COALESCE($2, title),
           content = COALESCE($3, content),
           category = COALESCE($4, category),
           tags = COALESCE($5::jsonb, tags),
           status = COALESCE($6, status),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, content, category, tags, status, views, created_by, created_at, updated_at`,
      [
        req.params.id,
        title || null,
        content || null,
        category || null,
        tags ? JSON.stringify(tags) : null,
        status || null
      ]
    );

    brain.logAction('blog.updated', { blogId: req.params.id, userId });
    return res.json({
      success: true,
      message: 'Blog atualizado com sucesso',
      data: mapBlogRow(updated.rows[0])
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar blog'
    });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.session.userId || req.user.id;
    const existing = await db.query(
      'SELECT id, created_by FROM blogs WHERE id = $1 LIMIT 1',
      [req.params.id]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blog nao encontrado'
      });
    }

    if (existing.rows[0].created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Voce nao tem permissao para deletar este blog'
      });
    }

    await db.query('DELETE FROM blogs WHERE id = $1', [req.params.id]);
    brain.logAction('blog.deleted', { blogId: req.params.id, userId });

    return res.json({
      success: true,
      message: 'Blog deletado com sucesso'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao deletar blog'
    });
  }
});

module.exports = router;
