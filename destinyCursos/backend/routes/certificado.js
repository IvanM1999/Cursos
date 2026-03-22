const router = require('express').Router();
const Certificate = require('../models/Certificate');
const gerarCertificado = require('../services/pdf');
const path = require('path');

router.post('/certificado/:id', async (req, res) => {
   
   const cert = await Certificate.findById(req.params.id);
   
   if (!cert.aprovado) {
      return res.status(403).json({ error: 'Não aprovado' });
   }
   
   const filePath = path.join(__dirname, `../certificados/${cert._id}.pdf`);
   
   gerarCertificado(
      req.body.nome,
      req.body.curso,
      req.body.empresa,
      new Date().toLocaleDateString(),
      filePath
   );
   
   cert.pdfUrl = filePath;
   await cert.save();
   
   res.json({ url: filePath });
});

module.exports = router;