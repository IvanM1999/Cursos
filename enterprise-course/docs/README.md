# Enterprise Course Platform

Plataforma web com autenticacao, blogs e dicionario de servicos.

## Estado atual do projeto

- Backend em Node.js + Express.
- Frontend em HTML/CSS/JS.
- Persistencia principal em PostgreSQL (usuarios e blogs).
- Sessao via `express-session`.
- Script de inicializacao local com auto-restart: `start-dev.bat`.

## Inicio rapido

Leia o guia completo em:

- [QUICKSTART.md](./QUICKSTART.md)

Resumo de 3 passos:

1. Inicie o PostgreSQL (recomendado com Docker):
   - `docker compose up -d postgres`
2. Rode migracao:
   - `npm run db:migrate`
3. Inicie a aplicacao:
   - `start-dev.bat` (Windows) ou `npm run dev`

## Rotas principais

Paginas:

- `/`
- `/login`
- `/signup`
- `/blog`
- `/blog/:id`
- `/blog/create`
- `/blog/:id/edit`
- `/dictionary`
- `/docs`
- `/profile`
- `/admin`

APIs principais:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/verify`
- `GET /api/blogs`
- `GET /api/blogs/:id`
- `POST /api/blogs`
- `PUT /api/blogs/:id`
- `DELETE /api/blogs/:id`
- `GET /api/users/profile`
- `PUT /api/users/profile`
- `GET /api/dictionary`
- `GET /api/dictionary/search?q=...`

## Scripts NPM

- `npm run dev`: sobe servidor com nodemon.
- `npm start`: sobe servidor em modo normal.
- `npm run db:migrate`: cria/atualiza tabelas no PostgreSQL.
- `npm test`: testes.
- `npm run lint`: lint.

## Variaveis de ambiente importantes

Veja `.env.example`.

Obrigatorias para rodar com seguranca:

- `JWT_SECRET`
- `SESSION_SECRET`

Obrigatoria para producao em Render:

- `DATABASE_URL`

## Deploy (Render)

Configuracao recomendada:

- Build Command: `npm ci --omit=dev`
- Start Command: `npm start`

Variaveis:

- `NODE_ENV=production`
- `BASE_URL=https://SEU-SERVICO.onrender.com`
- `JWT_SECRET`
- `SESSION_SECRET`
- `DATABASE_URL`
- `ADMIN_EMAIL` (opcional)

Depois do deploy, execute:

- `npm run db:migrate`

## Observacoes

- Se aparecer `EADDRINUSE`, ja existe processo usando a porta 3000.
- Se aparecer `ECONNREFUSED 5432`, o PostgreSQL nao esta rodando.
- O script `start-dev.bat` resolve boa parte dos conflitos locais automaticamente.

## Licenca

MIT

