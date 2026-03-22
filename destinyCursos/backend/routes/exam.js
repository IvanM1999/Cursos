const router = require('express').Router();
const Exam = require('../models/Exam');
const Certificate = require('../models/Certificate');

// buscar prova
router.get('/exam/:cursoId', async (req, res) => {
   const exam = await Exam.findOne({ cursoId: req.params.cursoId });
   res.json(exam);
});

// enviar respostas
router.post('/exam/:cursoId', async (req, res) => {
   
   const exam = await Exam.findOne({ cursoId: req.params.cursoId });
   const respostas = req.body.respostas;
   
   let acertos = 0;
   
   exam.perguntas.forEach((p, i) => {
      if (respostas[i] === p.respostaCorreta) {
         acertos++;
      }
   });
   
   const nota = (acertos / exam.perguntas.length) * 100;
   const aprovado = nota >= 70;
   
   const cert = await Certificate.create({
      userId: req.body.userId,
      cursoId: req.params.cursoId,
      empresaId: req.body.empresaId,
      nota,
      aprovado
   });
   
   res.json({ nota, aprovado, certId: cert._id });
});

module.exports = router;