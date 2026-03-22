const mongoose = require('mongoose');

module.exports = mongoose.model('Company', {
  nome: String,
  cnpj: String,
  plano: { type: String, default: 'trial' },
  limiteUsuarios: Number,
  criadaEm: { type: Date, default: Date.now }
});const mongoose = require('mongoose');

module.exports = mongoose.model('Company', {
  nome: String,
  cnpj: String,
  plano: { type: String, default: 'trial' },
  limiteUsuarios: Number,
  criadaEm: { type: Date, default: Date.now }
});