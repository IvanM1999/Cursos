const mongoose = require('mongoose');

module.exports = mongoose.model('Progress', {
   userId: String,
   cursoId: String,
   progresso: Number
});