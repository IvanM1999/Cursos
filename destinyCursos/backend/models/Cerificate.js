const mongoose = require('mongoose');

module.exports = mongoose.model('Certificate', {
   userId: String,
   cursoId: String,
   empresaId: String,
   nota: Number,
   aprovado: Boolean,
   data: { type: Date, default: Date.now },
   pdfUrl: String
});