const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

require('./config/db');

// rotas
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/cursos'));
app.use('/api', require('./routes/admin'));
app.use('/api', require('./routes/pagamento'));

app.listen(3000, () => console.log('Servidor rodando 🚀'));