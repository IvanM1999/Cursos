const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const blogRoutes = require('./routes/blogRoutes');
const dictionaryRoutes = require('./routes/dictionaryRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

const authMiddleware = require('./middleware/authMiddleware');
const sessionMiddleware = require('./middleware/sessionMiddleware');
const errorHandler = require('./middleware/errorHandler');
const db = require('./config/database');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

const requiredEnvVars = ['JWT_SECRET', 'SESSION_SECRET'];
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);
if (missingEnvVars.length > 0) {
  const message = `Missing required environment variables: ${missingEnvVars.join(', ')}`;
  if (isProduction) {
    throw new Error(message);
  }
  console.warn(`[WARN] ${message}`);
}

app.use(helmet());
app.use(cors({
  origin: process.env.BASE_URL || 'http://localhost:3000',
  credentials: true
}));

if (isProduction) {
  // Required for secure cookies behind Render proxy.
  app.set('trust proxy', 1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

app.use(express.static('frontend'));
app.use(express.static('frontend/public'));

app.set('view engine', 'html');
app.set('views', './frontend/pages');

app.engine('html', (filePath, options, callback) => {
  const fs = require('fs');

  const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  fs.readFile(filePath, (err, content) => {
    if (err) return callback(err);

    let html = content.toString();

    Object.keys(options).forEach((key) => {
      if (typeof options[key] !== 'function') {
        const value = options[key] == null ? '' : options[key];
        html = html.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), escapeHtml(value));
      }
    });

    html = html.replace(/{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g, (match, varName, eachContent) => {
      if (Array.isArray(options[varName])) {
        return options[varName].map((item) => {
          let itemContent = eachContent;
          itemContent = itemContent.replace(/{{this\.([\w.]+)}}/g, (m, p) => escapeHtml(item[p] || ''));
          return itemContent;
        }).join('');
      }
      return '';
    });

    // Supports {{#if var}} and {{#if !var}}
    html = html.replace(/{{#if\s+(!?\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, ifContent) => {
      const negate = condition.startsWith('!');
      const key = negate ? condition.slice(1) : condition;
      const value = Boolean(options[key]);
      return (negate ? !value : value) ? ifContent : '';
    });

    callback(null, html);
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/dictionary', dictionaryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.render('dashboard', {
    title: 'Enterprise Course - Dashboard',
    isAuthenticated: Boolean(req.session.userId),
    userName: req.session.userName || 'Guest'
  });
});

app.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  return res.render('login', { title: 'Enterprise Course - Login' });
});

app.get('/signup', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  return res.render('signup', { title: 'Enterprise Course - Cadastro' });
});

app.get('/blog', (req, res) => {
  res.render('blog-list', {
    title: 'Blogs',
    isAuthenticated: Boolean(req.session.userId)
  });
});

app.get('/blog/create', authMiddleware, (req, res) => {
  res.render('blog-create', {
    title: 'Criar Blog',
    isAuthenticated: true
  });
});

app.get('/blog/:id/edit', authMiddleware, (req, res) => {
  res.render('blog-edit', {
    title: 'Editar Blog',
    isAuthenticated: true,
    blogId: req.params.id
  });
});

app.get('/blog/:id', (req, res) => {
  res.render('blog-view', {
    title: 'Visualizar Blog',
    isAuthenticated: Boolean(req.session.userId),
    blogId: req.params.id
  });
});

app.get('/dictionary', (req, res) => {
  res.render('dictionary', {
    title: 'Dicionario de Servicos',
    isAuthenticated: Boolean(req.session.userId)
  });
});

app.get('/docs', (req, res) => {
  res.render('documentation', {
    title: 'Documentacao e Guia de Desenvolvimento',
    isAuthenticated: Boolean(req.session.userId)
  });
});

app.get('/profile', authMiddleware, (req, res) => {
  res.render('profile', {
    title: 'Meu Perfil',
    isAuthenticated: true,
    userName: req.session.userName
  });
});

app.get('/admin', authMiddleware, (req, res) => {
  const isSessionAdmin = req.session.role === 'admin';
  const isDefaultAdmin = String(req.session.userId) === '1';

  if (!isSessionAdmin && !isDefaultAdmin) {
    return res.status(403).render('403', {
      title: 'Acesso Negado',
      message: 'Voce nao tem permissao para acessar esta area.'
    });
  }

  return res.render('admin', {
    title: 'Painel de Controle Administrativo',
    isAuthenticated: true,
    isAdmin: true,
    userName: req.session.userName
  });
});

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Pagina nao encontrada'
  });
});

const PORT = process.env.PORT || 3000;

function formatStartupError(error) {
  if (!error) return 'Unknown startup error';
  if (error.message && error.message.trim()) return error.message;
  if (Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors.map((e) => e.message || e.code || String(e)).join(' | ');
  }
  if (error.code) return `Code: ${error.code}`;
  try {
    return JSON.stringify(error);
  } catch (e) {
    return String(error);
  }
}

async function startServer() {
  try {
    await db.initDatabase();
    console.log('Database initialized');

    app.listen(PORT, () => {
      console.log(`Enterprise Course Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', formatStartupError(error));
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    process.exit(1);
  }
}

startServer();

module.exports = app;
