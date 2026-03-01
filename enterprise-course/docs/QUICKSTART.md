# Quick Start - Enterprise Course Platform

Guia rapido para iniciar o projeto localmente sem complicacao.

## 1. O que voce precisa

- Node.js 18+ (recomendado 20+)
- npm
- Docker Desktop (recomendado para subir o PostgreSQL sem instalar manualmente)

## 2. Primeiro uso (mais facil)

No PowerShell, rode este comando:

```powershell
& "C:\Users\dk\OneDrive\.Projetos\Projetos independentes\Testes\Cursos\enterprise-course\start-dev.bat"
```

O script faz automaticamente:

1. Entra na pasta do projeto.
2. Verifica Node e npm.
3. Instala dependencias (se faltar `node_modules`).
4. Cria `.env` (se nao existir).
5. Fecha instancias antigas do servidor desse projeto.
6. Libera a porta `3000` se estiver ocupada.
7. Inicia `npm run dev`.

## 3. Subir o banco (obrigatorio)

Hoje o projeto usa PostgreSQL para usuarios e blogs.
Se o banco nao estiver ativo, o servidor nao inicia.

### Opcao recomendada (Docker)

No terminal:

```powershell
cd "C:\Users\dk\OneDrive\.Projetos\Projetos independentes\Testes\Cursos\enterprise-course"
docker compose up -d postgres
npm run db:migrate
```

Depois disso, rode novamente o `start-dev.bat`.

## 4. URLs principais

- App: `http://localhost:3000`
- Login: `http://localhost:3000/login`
- Cadastro: `http://localhost:3000/signup`
- Blogs: `http://localhost:3000/blog`
- Dicionario: `http://localhost:3000/dictionary`
- Docs: `http://localhost:3000/docs`

## 5. Erros comuns e solucao

### Erro: `npm ERR! enoent ... package.json`
Voce executou `npm run dev` fora da pasta do projeto.
Use o `start-dev.bat` ou entre em `enterprise-course` antes.

### Erro: `EADDRINUSE: address already in use :::3000`
A porta 3000 esta ocupada.
O `start-dev.bat` ja tenta resolver isso automaticamente.

### Erro: `ECONNREFUSED 127.0.0.1:5432`
PostgreSQL nao esta rodando.
Suba com:

```powershell
docker compose up -d postgres
npm run db:migrate
```

## 6. Rodar manualmente (sem script)

Se preferir rodar tudo manualmente:

```powershell
cd "C:\Users\dk\OneDrive\.Projetos\Projetos independentes\Testes\Cursos\enterprise-course"
npm install
copy .env.example .env
docker compose up -d postgres
npm run db:migrate
npm run dev
```

## 7. Deploy rapido no Render

Configure no Web Service:

- Build Command: `npm ci --omit=dev`
- Start Command: `npm start`

Variaveis obrigatorias:

- `NODE_ENV=production`
- `BASE_URL=https://SEU-SERVICO.onrender.com`
- `JWT_SECRET=<chave-forte>`
- `SESSION_SECRET=<chave-forte>`
- `DATABASE_URL=<postgres-do-render>`
- `ADMIN_EMAIL=<email-admin-opcional>`

Depois execute a migracao no ambiente:

```bash
npm run db:migrate
```

