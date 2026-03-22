const mongoose = require('mongoose');

module.exports = mongoose.model('Course', {
   titulo: String,
   area: String,
   tipo: String,
   obrigatorio: Boolean,
   empresaId: String // 🔥 cada empresa pode ter seus cursos
});;