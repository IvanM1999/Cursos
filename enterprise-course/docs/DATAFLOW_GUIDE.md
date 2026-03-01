# 📊 MAPA DE FLUXO DE DADOS E ENCAMINHAMENTOS

## 🎯 Visão Geral da Plataforma

A plataforma Enterprise Course opera com um sistema centralizado de controle de acessos, registro de chaves e monitoramento de fluxo de dados. Cada operação é rastreada e auditada.

---

## 1️⃣ FLUXO DE AUTENTICAÇÃO

### Login Flow
```
Cliente Browser
    ↓
POST /api/auth/login (Email + Senha)
    ↓
authRoutes.js:
  - Valida credenciais (Brain.validateLoginCredentials)
  - Gera JWT Token
  - Cria Sessão Express
    ↓
AccessControlDashboard.recordLoginAttempt()
  - Registra tentativa
  - Cria sessão ativa se sucesso
  - Log em audit system
    ↓
Response: { token, session_id, user_data }
    ↓
Client: localStorage.setItem('token', jwt)
Client: sessionStorage.setItem('sessionId', session_id)
```

**Para onde os dados vão:**
- ✅ Sucesso → `activeSessions` (AccessControl) → Dashboard
- ❌ Falha → `lockedUsers` (brute force detection) → Alertas
- 📋 Audit Log → KeyManager.logDataFlow()

---

## 2️⃣ FLUXO DE CRIAÇÃO DE BLOG

### Create Blog Flow
```
Cliente Autenticado
    ↓
POST /api/blogs (título, conteúdo, tags)
    ↓
authMiddleware (verifica JWT):
  - Valida token em KeyManager
  - Registra acesso em AccessControl
    ↓
blogRoutes.js: CREATE handler
  - Brain.processBlogCreation() (validação)
  - Armazena em Database (mock array → real DB)
    ↓
AccessControlDashboard.recordDataFlow():
  - source: "api/blogs"
  - destination: "blogs_database"
  - method: "POST"
  - user_id: req.session.userId
    ↓
Response: { blog_id, status, timestamp }
```

**Para onde os dados vão:**
- 📊 Dados do blog → `blogs_database` (MongoDB/PostgreSQL)
- 📝 Log de operação → KeyManager + AccessControl
- 🔍 Rastreável em `/api/admin/data-flows`

---

## 3️⃣ FLUXO DE LEITURA (GET REQUEST)

### Read Blog Flow
```
Cliente (autenticado ou não)
    ↓
GET /api/blogs/:id
    ↓
blogRoutes.js: READ handler
  - Verifica permissão (público ou privado)
  - AccessControl.checkResourcePermission()
  - Retorna dados
    ↓
AccessControlDashboard.logAccess():
  - action: "read"
  - resource: "blog"
  - status: "success"
    ↓
Response: { blog_data }
```

**Para onde os dados vão:**
- 📖 Renderizado no browser
- 📋 Registrado em access logs
- 📊 Contado em estatísticas

---

## 4️⃣ FLUXO DE GERENCIAMENTO DE CHAVES

### Key Rotation Process
```
Admin User
    ↓
POST /api/admin/keys/rotate
  - Envia: { key_name, new_value }
    ↓
adminRoutes.js:
  - requireAdmin middleware (verifica role)
  - KeyManager.rotate(name, newValue)
    ↓
KeyManager: ENCRIPTAÇÃO
  - Criptografa nova_chave com AES-256
  - Armazena em memory (Singleton)
  - Mantém valor anterior para fallback
    ↓
LogAudit: KEY_ROTATED
  - Timestamp
  - Admin ID
  - Nome da chave
    ↓
Response: { status, message }
```

**Para onde os dados vão:**
- 🔐 Novo valor → KeyManager (em memória + encrypted)
- 📝 Log → accessLog array → Dashboard Admin
- 🚨 Se falha → Alert system → ActiveAlerts

---

## 5️⃣ FLUXO DE DATA SCRAPING

### Complete Scraping Cycle
```
Admin User
    ↓
POST /api/admin/data-scraper/run
    ↓
dataRoutes: Inicia DataScraper.runFullScrape()
    ↓
ESTÁGIO 1: COLETA
  ├─ scrapeUsers() → {id, email, name, role, created_at}
  ├─ scrapeBlog() → {id, title, content, author_id, status}
  ├─ scrapeActivities() → {id, user_id, action, timestamp}
  └─ scrapeMetrics() → {memory, uptime, response_time}
    ↓
ESTÁGIO 2: LIMPEZA
  - Remove valores null/undefined
  - Remove dados com > 30 dias
  - Normaliza timestamps
    ↓
ESTÁGIO 3: DEDUPLICAÇÃO
  - Calcula hash MD5 de cada registro
  - Remove duplicatas
  - Registra quantas removidas
    ↓
ESTÁGIO 4: EXPORTAÇÃO
  - Escreve JSON em /backend/data/scraped_data_[timestamp].json
  - Armazena em scrapedData (memory)
    ↓
Response: { data, stats, duration_ms }
    ↓
Admin Dashboard: Exibe em aba "Data Scraper"
```

**Para onde os dados vão:**
- 💾 Arquivo JSON → `/backend/data/` (backup)
- 📊 Memory → `DataScraper.scrapedData` (acesso rápido)
- 📈 Estatísticas → Dashboard Admin
- 🔍 Disponível em `GET /api/admin/scraper/data/:category`

---

## 6️⃣ FLUXO DE REGISTRO DE ACESSOS (ACCESS CONTROL)

### Access Log Recording
```
Qualquer Requisição HTTP
    ↓
sessionMiddleware.js:
  - Extrai session_id
  - Extrai user_id do JWT
    ↓
authMiddleware.js (se rota é protegida):
  - Valida JWT token
  - Verifica em KeyManager
    ↓
AccessControlDashboard.logAccess():
  {
    id: unique_event_id,
    user_id: from_session,
    action: "read|create|update|delete",
    resource: "blog|user|admin",
    ip: req.ip,
    user_agent: req.headers['user-agent'],
    timestamp: now(),
    status: "success|failed|denied",
    destination: "database|api|cache"
  }
    ↓
Armazenado em: AccessControlDashboard.events[]
    ↓
Acessível em:
  - GET /api/admin/access-logs?days=7&status=success
  - Dashboard em tempo real (atualiza cada 30s)
```

**Para onde os dados vão:**
- 🔍 Registrados em `AccessControlDashboard.events` (array)
- 📊 Filtrados por: dias, usuário, recurso, status
- 📈 Agregados em estatísticas
- 🚨 Analisados para detectar anomalias (brute force, etc)

---

## 7️⃣ FLUXO DE ALERTAS DE SEGURANÇA

### Alert Detection System
```
AccessControlDashboard.checkForAlerts()
    ↓
DETECÇÃO 1: BRUTE FORCE
  - 5+ tentativas de login falhadas no mesmo IP
  - Usuário é bloqueado por 15 minutos
  - Alert criado com severity: "high"
    ↓
DETECÇÃO 2: ATIVIDADE SUSPEITA
  - 20+ operações em 60 segundos (possível automação)
  - Alert criado com severity: "medium"
    ↓
DETECÇÃO 3: ACESSO NÃO AUTORIZADO
  - 5+ negações de acesso em 5 minutos
  - Alert criado com severity: "high"
    ↓
Cada alerta:
  {
    id: "ALT_...",
    type: "BRUTE_FORCE_DETECTED|SUSPICIOUS_ACTIVITY|UNAUTHORIZED_ACCESS",
    severity: "high|medium|low",
    data: { user_id, ip, reason, details },
    timestamp: now(),
    status: "active|resolved"
  }
    ↓
Armazenado em: AccessControlDashboard.alerts[]
    ↓
Acessível em:
  - GET /api/admin/alerts (últimos 50)
  - Dashboard: aba "Alertas"
  - KeyManager: logAudit("ALERT_TYPE", data)
```

**Para onde os dados vão:**
- 🚨 AlertasAtivos → Dashboard (exibido em tempo real)
- 📝 Log → KeyManager + AccessControl
- 🔐 Usuários bloqueados → lockedUsers map (unlock_at timestamp)

---

## 8️⃣ FLUXO DE FLUXO DE DADOS (DATA FLOW TRACKING)

### Data Flow Tracking
```
Qualquer operação com dados
    ↓
AccessControlDashboard.recordDataFlow():
  {
    source: "api|file|database",
    destination: "database|cache|file",
    method: "CREATE|READ|UPDATE|DELETE",
    user_id: current_user,
    data_size: bytes,
    duration_ms: elapsed_time,
    status: "pending|success|error"
  }
    ↓
Chamado também por:
  - KeyManager.logDataFlow() (operações com chaves)
  - DataScraper.runFullScrape() (coleta de dados)
  - Qualquer rota de API
    ↓
Armazenado em:
  - AccessControlDashboard.events
  - KeyManager.accessLog (com timestamp)
    ↓
Acessível em:
  - GET /api/admin/data-flows
  - Filtrado por: type, startDate, endDate
```

**Para onde os dados vão:**
- 🔄 Entre aplicações → rastreado e registrado
- 📊 Dashboard → exibido em grafos/logs
- 💾 Backup → arquivo JSON (via scraper)
- 🔍 Auditoria de conformidade → relatórios

---

## 9️⃣ FLUXO DE DASHBOARD ADMIN

### Admin Dashboard Update Cycle
```
Admin acessa /admin
    ↓
HTML carregado: admin.html
    ↓
JavaScript executa no DOMContentLoaded:
    ↓
1. loadDashboard()
   └─ GET /api/admin/dashboard
      └─ Retorna: stats, alerts, sessions, keys
         └─ Renderiza overview cards
    ↓
2. loadAccessLogs()
   └─ GET /api/admin/access-logs?days=7
      └─ Retorna: recent_events, summary, by_status
         └─ Renderiza tabela
    ↓
3. loadKeys()
   └─ GET /api/admin/keys
      └─ Retorna: name, type, sensitive, access_count (SEM VALORES)
         └─ Renderiza tabela
    ↓
4. loadAlerts()
   └─ GET /api/admin/alerts
      └─ Retorna: active_alerts, data
         └─ Renderiza com badges de severidade
    ↓
5. loadDataFlows()
   └─ GET /api/admin/data-flows
      └─ Retorna: records, summary
         └─ Renderiza log das operações
    ↓
Auto-refresh a cada 30 segundos
    ↓
Admin pode clicar em "Executar Scraping"
    └─ POST /api/admin/data-scraper/run
       └─ Executa coleta completa
          └─ Exibe resultado
```

**Para onde os dados vão:**
- 📊 API → JSON → DOM
- 🎨 Renderizado em abas (tabs)
- 🔄 Atualizado periodicamente
- 📱 Responsivo em mobile

---

## 🔑 CHAVES REGISTRADAS NO SISTEMA

```
KeyManager (Singleton)
├── JWT_SECRET
│   ├── type: authentication
│   ├── sensitive: true (encriptada)
│   ├── expires_in: 90 dias
│   └── uso: Validar tokens JWT
│
├── DB_MONGODB_URI
│   ├── type: database
│   ├── sensitive: true (encriptada)
│   ├── expires_in: nunca
│   └── uso: Conexão MongoDB
│
├── DB_POSTGRESQL_URL
│   ├── type: database
│   ├── sensitive: true (encriptada)
│   ├── expires_in: nunca
│   └── uso: Conexão PostgreSQL
│
├── SESSION_SECRET
│   ├── type: session
│   ├── sensitive: true (encriptada)
│   ├── expires_in: 30 dias
│   └── uso: Validar cookies de sessão
│
├── API_RATE_LIMIT
│   ├── type: configuration
│   ├── sensitive: false
│   ├── expires_in: nunca
│   └── uso: Limitar requisições
│
└── ADMIN_API_KEY
    ├── type: api
    ├── sensitive: true (encriptada)
    ├── expires_in: 180 dias
    └── uso: Autenticação API externa
```

---

## 📊 ESTATÍSTICAS COLETADAS

### AccessControlDashboard.stats
```
{
  total_logins: número,          // Total de logins bem-sucedidos
  failed_logins: número,         // Total de falhas
  total_operations: número,      // Total de operações no sistema
  blocked_operations: número,    // Operações negadas
  data_flows: número             // Fluxos de dados registrados
}
```

### DataScraper.stats
```
{
  started: timestamp,            // Quando iniciou
  last_scrape: timestamp,        // Último scraping
  total_records: número,         // Total de registros coletados
  errors: número                 // Erros durante scraping
}
```

---

## 🔐 SEGURANÇA E ENCRIPTAÇÃO

### Valores Sensíveis
- ✅ JWT_SECRET → Encriptado com AES-256-CBC
- ✅ DB_MONGODB_URI → Encriptado
- ✅ DB_POSTGRESQL_URL → Encriptado
- ✅ SESSION_SECRET → Encriptado
- ✅ ADMIN_API_KEY → Encriptado

### Valores Não-Sensíveis (Retornados em Admin)
- ❌ API_RATE_LIMIT (valor público)
- ❌ Dados de usuários publicados voluntariamente
- ❌ Dados de blogs públicos

---

## 📈 RELATÓRIOS DISPONÍVEIS

### GET /api/admin/dashboard
- Visão geral do sistema
- Estatísticas consolidadas
- Status do KeyManager

### GET /api/admin/access-logs?days=7
- Logs filtrados por período
- Resumo por status (success/failed/denied)
- Eventos recentes

### GET /api/admin/data-flows
- Fluxo completo de dados
- Origem e destino
- Histórico temporal

### GET /api/admin/statistics
- Estatísticas de acesso
- Dados do scraper
- Resumo do sistema

### GET /api/admin/system-health
- Uptime
- Uso de memória
- Alertas ativos
- Status geral

---

## 🛠️ FERRAMENTAS DE ADMIN

### Gerenciamento de Chaves
```
POST /api/admin/keys/rotate
{
  "key_name": "JWT_SECRET",
  "new_value": "novo-valor-secreto"
}
```

### Executar Data Scraper
```
POST /api/admin/data-scraper/run
Resposta: { duration_ms, data, stats }
```

### Obter Dados Coletados
```
GET /api/admin/scraper/data/users
GET /api/admin/scraper/data/blogs
GET /api/admin/scraper/data/activities
GET /api/admin/scraper/data/metrics
```

---

## ⚠️ ALERTAS AUTOMÁTICOS

| Tipo | Severidade | Acionador | Ação |
|------|-----------|-----------|------|
| BRUTE_FORCE_DETECTED | high | 5+ login falhas | Bloqueia usuário por 15 min |
| SUSPICIOUS_ACTIVITY | medium | 20+ ops em 60s | Registra alerta |
| UNAUTHORIZED_ACCESS | high | 5+ denials em 5 min | Registra alerta |
| INVALID_SESSION | medium | Sessão expirada | Auto-resolve |

---

## 📝 EXEMPLO DE FLUXO COMPLETO: USUÁRIO CRIA BLOG

```
1. Usuário clica "Criar Blog"
   ↓
2. Browser: GET /blog/create
   ↓
3. Server: Verifica authMiddleware
   └─ KeyManager.get('JWT_SECRET') [log de acesso a chave]
   └─ AccessControl.validateSession(sessionId)
   └─ AccessControl.logAccess({ action: 'access_create_form', resource: 'blog' })
   ↓
4. Server renderiza formulário blog-create.html
   ↓
5. Usuário preenche e clica "Publicar"
   ↓
6. Browser: POST /api/blogs
   {
     "title": "...",
     "content": "...",
     "tags": ["..."]
   }
   ↓
7. Server: authMiddleware valida JWT
   └─ KeyManager.get('JWT_SECRET', { userId: 1, requestType: 'token_validation', ip: '...' })
      └─ AccessControl.logAccess({ action: 'token_validation', resource: 'auth' })
   ↓
8. Server: blogRoutes POST handler
   └─ Brain.validateBlogData() [validação de dados]
   └─ Armazena em database (mock)
   └─ AccessControl.recordDataFlow({
       source: 'api/blogs',
       destination: 'blogs_database',
       method: 'POST',
       user_id: 1,
       data_size: 2048
     })
   └─ AccessControl.logAccess({
       action: 'create',
       resource: 'blog',
       status: 'success',
       destination: 'blogs_database'
     })
   ↓
9. Server responde: { blog_id: 123, status: 'published' }
   ↓
10. Admin Dashboard /api/admin/dashboard mostra:
    - Nova operação registrada
    - Fluxo de dados visível em /api/admin/data-flows
    - Estatísticas de operações aumentadas
   ↓
11. Admin pode rastrear em /api/admin/access-logs:
    - Quem criou (user_id: 1)
    - Quando (timestamp)
    - Qual recurso (blog)
    - Status (success)
    - Para onde foi (blogs_database)
```

---

## 📱 COMO ACESSAR O PAINEL ADMIN

1. **Login como admin** (user_id = 1)
2. **Acesse**: http://localhost:3000/admin
3. **Abas disponíveis**:
   - 📊 Visão Geral (Dashboard)
   - 📋 Logs de Acesso
   - 🔑 Chaves do Sistema
   - 🔍 Data Scraper
   - 🚨 Alertas
   - 🔄 Fluxo de Dados

---

## 🎯 RESUMO DAS RESPONSABILIDADES

| Componente | Responsabilidade |
|-----------|------------------|
| **KeyManager** | Registrar, criptografar e gerenciar chaves sensíveis |
| **DataScraper** | Coletar, limpar e desduplicar dados do sistema |
| **AccessControl** | Registrar acessos, validar sessões, detectar anomalias |
| **authMiddleware** | Validar JWT e rastrear acesso às chaves |
| **blogRoutes** | Processar operações CRUD com auditoria |
| **adminRoutes** | Fornecer endpoints para o painel de admin |
| **admin.html** | Interface visual para monitoramento |

Este documento serve como guia completo para entender como dados fluem pela plataforma e para onde são encaminhados em cada operação.
