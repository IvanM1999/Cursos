const mongoose = require('mongoose');

module.exports = mongoose.model('User', {
   email: String,
   password: String,
   empresaId: String, // 🔥 vínculo com empresa
   role: { type: String, default: 'user' } // admin ou user
});