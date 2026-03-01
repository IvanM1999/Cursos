# Complete Guide - Enterprise Course Platform

Este documento e tecnico, mas direto ao ponto.
Para um passo a passo mais simples, comece por `QUICKSTART.md`.

## 1. Arquitetura atual

- Backend: Node.js + Express.
- Frontend: HTML/CSS/JS server-rendered.
- Banco principal: PostgreSQL.
- Sessao: `express-session`.
- Auth: sessao + JWT para endpoints protegidos.

## 2. Estrutura relevante

```text
enterprise-course/
  backend/src/
    config/
      database.js
      migrate.js
    middleware/
    routes/
      authRoutes.js
      blogRoutes.js
      userRoutes.js
      dictionaryRoutes.js
      adminRoutes.js
    server.js
  frontend/
    pages/
    assets/
  start-dev.bat
  .env.example
```

## 3. Setup local recomendado

1. Subir PostgreSQL:
   - `docker compose up -d postgres`
2. Executar migracao:
   - `npm run db:migrate`
3. Subir app:
   - `start-dev.bat` (Windows)
   - ou `npm run dev`

## 4. Variaveis de ambiente

Essenciais:

- `JWT_SECRET`
- `SESSION_SECRET`
- `DATABASE_URL` (ou `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`)

Importantes:

- `NODE_ENV`
- `PORT`
- `BASE_URL`
- `ADMIN_EMAIL`

## 5. Banco de dados (schema base)

Criado por `backend/src/config/migrate.js`:

- `users`
  - `id`, `email`, `name`, `password_hash`, `role`, `created_at`, `updated_at`
- `blogs`
  - `id`, `title`, `content`, `category`, `tags`, `status`, `views`, `created_by`, `created_at`, `updated_at`

## 6. Fluxo de inicializacao

No startup (`server.js`):

1. valida env minima;
2. registra middlewares de seguranca;
3. inicializa banco (`initDatabase`);
4. inicia HTTP server.

Se o banco estiver indisponivel, o processo encerra com erro claro.

## 7. Endpoints principais

Auth:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/verify`

Blogs:

- `GET /api/blogs`
- `GET /api/blogs/:id`
- `POST /api/blogs`
- `PUT /api/blogs/:id`
- `DELETE /api/blogs/:id`

Users:

- `GET /api/users/profile`
- `PUT /api/users/profile`

Dictionary:

- `GET /api/dictionary`
- `GET /api/dictionary/search?q=...`
- `GET /api/dictionary/:id`

## 8. Render (producao)

Configurar no Web Service:

- Build: `npm ci --omit=dev`
- Start: `npm start`

Variaveis:

- `NODE_ENV=production`
- `BASE_URL=https://SEU-SERVICO.onrender.com`
- `JWT_SECRET=<forte>`
- `SESSION_SECRET=<forte>`
- `DATABASE_URL=<render-postgres>`
- `ADMIN_EMAIL=<opcional>`

Rodar migracao:

- `npm run db:migrate`

## 9. Troubleshooting

`EADDRINUSE :::3000`:

- processo antigo ocupando porta;
- use `start-dev.bat` para encerrar e reiniciar.

`ECONNREFUSED 5432`:

- PostgreSQL parado;
- suba `postgres` no Docker e rode migracao.

`npm ERR! enoent package.json`:

- comando executado fora da pasta;
- rode o `.bat` por caminho absoluto.

