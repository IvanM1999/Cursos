const mongoose = require('mongoose');

module.exports = mongoose.model('Exam', {
  cursoId: String,
  perguntas: [
    {
      pergunta: String,
      opcoes: [String],
      respostaCorreta: Number
    }
  ]
});