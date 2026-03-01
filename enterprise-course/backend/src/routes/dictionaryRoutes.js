const express = require('express');
const router = express.Router();

const dictionary = [
  {
    id: '1',
    name: 'Auth Service',
    description: 'Servico de autenticacao e autorizacao',
    endpoints: [
      { method: 'POST', path: '/api/auth/login', description: 'Realiza login do usuario' },
      { method: 'POST', path: '/api/auth/signup', description: 'Registra novo usuario' },
      { method: 'POST', path: '/api/auth/logout', description: 'Faz logout do usuario' }
    ],
    status: 'active'
  },
  {
    id: '2',
    name: 'Blog Service',
    description: 'Servico de gerenciamento de blogs',
    endpoints: [
      { method: 'GET', path: '/api/blogs', description: 'Lista todos os blogs' },
      { method: 'POST', path: '/api/blogs', description: 'Cria novo blog' },
      { method: 'PUT', path: '/api/blogs/:id', description: 'Atualiza um blog' },
      { method: 'DELETE', path: '/api/blogs/:id', description: 'Deleta um blog' }
    ],
    status: 'active'
  },
  {
    id: '3',
    name: 'User Service',
    description: 'Servico de gerenciamento de usuarios',
    endpoints: [
      { method: 'GET', path: '/api/users/profile', description: 'Obtem perfil do usuario' },
      { method: 'PUT', path: '/api/users/profile', description: 'Atualiza perfil' },
      { method: 'GET', path: '/api/users/all', description: 'Lista usuarios' }
    ],
    status: 'active'
  },
  {
    id: '4',
    name: 'Dictionary Service',
    description: 'Servico de documentacao de APIs',
    endpoints: [
      { method: 'GET', path: '/api/dictionary', description: 'Lista todos os servicos' },
      { method: 'GET', path: '/api/dictionary/:id', description: 'Obtem detalhes de um servico' }
    ],
    status: 'active'
  }
];

router.get('/', (req, res) => {
  try {
    return res.json({
      success: true,
      data: dictionary,
      total: dictionary.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar dicionario'
    });
  }
});

// Must come before /:id
router.get('/search', (req, res) => {
  try {
    const query = req.query.q?.toLowerCase() || '';
    if (!query) {
      return res.json({
        success: true,
        data: dictionary
      });
    }

    const results = dictionary.filter((service) =>
      service.name.toLowerCase().includes(query) ||
      service.description.toLowerCase().includes(query)
    );

    return res.json({
      success: true,
      data: results,
      total: results.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro na busca'
    });
  }
});

router.get('/:id', (req, res) => {
  try {
    const service = dictionary.find((s) => s.id === req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servico nao encontrado'
      });
    }

    return res.json({
      success: true,
      data: service
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar servico'
    });
  }
});

module.exports = router;
