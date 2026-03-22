const router = require('express').Router();
const Course = require('../models/Course');

router.get('/cursos', async (req, res) => {
   const cursos = await Course.find();
   res.json(cursos);
});

module.exports = router;