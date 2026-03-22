const router = require('express').Router();
const Course = require('../models/Course');

router.post('/admin/add-curso', async (req, res) => {
   const curso = await Course.create(req.body);
   res.json(curso);
});

router.get('/admin/cursos', async (req, res) => {
   const cursos = await Course.find();
   res.json(cursos);
});

router.delete('/admin/cursos/:id', async (req, res) => {
   await Course.findByIdAndDelete(req.params.id);
   res.json({ ok: true });
});

module.exports = router;