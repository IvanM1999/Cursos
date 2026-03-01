# 🚀 SERVIDOR ROBUSTO COM AUTO-RESTART

## 📋 Visão Geral

O novo sistema de inicialização usa dois componentes principais:
1. **FileWatcher.js** - Monitora arquivos em tempo real
2. **ServerBootstrap.js** - Gerencia o ciclo de vida do servidor com recuperação automática

---

## 🎯 Características Principais

### ✅ Auto-Restart Inteligente
- 🔄 Reinicia automaticamente ao detectar mudanças em arquivos simbólicos
- 🛡️ Recuperação automática de crashes
- ⏱️ Cooldown entre restarts (evita loops infinitos)
- 📊 Limite máximo de restarts (padrão: 5)

### ✅ File Watching em Tempo Real
- 📁 Monitora 4 diretórios principais:
  - `backend/src/` (rotas, middleware, utils)
  - `frontend/pages/` (templates HTML)
  - `frontend/assets/js/` (JavaScript)
  - `frontend/assets/css/` (CSS)

- 📄 13 arquivos simbólicos monitorados:
  - server.js
  - Todas as rotas (auth, blog, dictionary, user, admin)
  - Todos os middlewares
  - Utilities (KeyManager, DataScraper, AccessControl)

### ✅ Recuperação de Erros
- 💥 Detecta crashes do processo
- 🔧 Logs detalhados de erros
- 🔄 Auto-restart gracioso
- 📈 Estatísticas completas

### ✅ Logging Detalhado
- ⏰ Timestamp em cada log
- 🎯 Informações de restart (motivo, count)
- 📊 Uptime e estatísticas
- 🐛 Stack traces de erros

---

## 🚀 Como Usar

### Opção 1: Executar via Batch (Recomendado para Windows)
```bash
# Clique duplo em start-dev.bat
# OU abra PowerShell e execute:
.\start-dev.bat
```

**Resultado:**
- ✅ Valida Node.js e npm
- ✅ Instala dependências se necessário
- ✅ Cria arquivo .env se não existir
- ✅ Limpa processos antigos
- ✅ Inicia ServerBootstrap

### Opção 2: Via npm
```bash
npm run dev
```

### Opção 3: Diretamente com node
```bash
node backend/src/utils/ServerBootstrap.js
```

### Opção 4: Simples (sem auto-restart)
```bash
npm run dev:simple
# OU
npm run start
```

---

## 📊 Fluxo de Operação

```
┌─────────────────────────────────────────────────────────────┐
│ Start (start-dev.bat)                                       │
└───────────────┬─────────────────────────────────────────────┘
                │
                ├─ Verifica Node.js ✓
                ├─ Verifica npm ✓
                ├─ npm install --legacy-peer-deps ✓
                ├─ .env check ✓
                └─ Limpa processos antigos ✓
                │
┌───────────────▼─────────────────────────────────────────────┐
│ ServerBootstrap.start()                                     │
└───────────────┬─────────────────────────────────────────────┘
                │
                ├─ Inicia FileWatcher
                │  └─ Monitora 4 diretórios
                │  └─ 13 arquivos simbólicos
                │
                └─ Spawn processo Node.js (server.js)
                   │
                   ├─ stdout → console.log()
                   ├─ stderr → console.error()
                   └─ exit → attemptRestart()
                      │
                      ├─ Se erro → Log + Restart
                      └─ Se sucesso → Stats
```

### Fluxo de Auto-Restart

```
Arquivo simbólico muda
    ↓
FileWatcher.handleFileChange()
    ↓
Debounce 500ms (agrupa mudanças rápidas)
    ↓
emit('symbolic-file-changed')
    ↓
scheduleRestart('symbolic-file-changed')
    ↓
setTimeout(1000ms)
    ↓
ServerBootstrap.attemptRestart()
    ├─ Verifica limite de restarts
    ├─ Verifica cooldown (2000ms)
    └─ Spawn novo processo
        └─ BACK to "Spawn processo Node.js"
```

---

## 🎮 Controles de Teclado (Modo Interativo)

Quando o servidor está rodando em terminal interativo:

| Tecla | Ação | Descrição |
|-------|------|-----------|
| **r** | Restart | Reinicia servidor manualmente |
| **s** | Status | Exibe status e estatísticas |
| **q** | Quit | Finaliza servidor graciosamente |

**Exemplo:**
```
💡 Atalhos de teclado:
   r - Reiniciar servidor manualmente
   s - Ver status
   q - Sair

[Pressione 'r' para reiniciar...]
```

---

## 📝 Logs e Saída

### Logs Normal
```
[14:23:45]
============================================================
🚀 Enterprise Course Platform - Servidor Iniciando
============================================================

⚙️  Configurações:
   Porta: 3000
   Script: ./backend/src/server.js
   Watch Files: SIM

[14:23:46] 🔧 Iniciando novo processo do servidor...
[14:23:46] ✅ Processo iniciado com PID: 12345
[14:23:46] 📂 Monitorando: backend/src
[14:23:46] 📂 Monitorando: frontend/pages
[14:23:46] ✅ FileWatcher ativo

✅ Servidor está pronto. Observando alterações...

🌐 Enterprise Course Server rodando em http://localhost:3000
```

### Logs ao Detectar Mudança
```
[14:25:12] 📝 Arquivo modificado: backend/src/routes/adminRoutes.js
[14:25:12] 🔴 ARQUIVO SIMBÓLICO alterado! Restart necessário...

============================================================
🔄 REINICIANDO SERVIDOR (1/5)
Motivo: symbolic-file-changed
Timestamp: 01/03/2026 14:25:13
============================================================

[14:25:13] 🔧 Iniciando novo processo do servidor...
[14:25:13] ✅ Processo iniciado com PID: 12346
```

### Logs ao Detectar Erro
```
[14:30:22] ❌ [STDERR] TypeError: Cannot read property 'routes' of undefined
    at /project/backend/src/server.js:45:10

[14:30:22] ❌ Servidor crashed com código de erro: 1

============================================================
🔄 REINICIANDO SERVIDOR (2/5)
Motivo: process-crash
Timestamp: 01/03/2026 14:30:23
============================================================
```

---

## ⚙️ Configuração

### Opções de ServerBootstrap

```javascript
new ServerBootstrap({
  port: 3000,                    // Porta padrão
  scriptPath: './backend/src/server.js',  // Caminho do server
  maxRestarts: 5,                // Máximo de restarts
  restartCooldown: 2000,         // Espera entre restarts (ms)
  watchFiles: true,              // Habilitar file watching
  enableLogging: true            // Habilitar logs
});
```

### Opções de FileWatcher

```javascript
new FileWatcher({
  debounceTime: 500,            // Agrupa mudanças (ms)
  recursiveWatch: true,          // Monitorar subdiretórios
  ignorePatterns: [             // Ignorar arquivos
    'node_modules',
    '.env.local',
    '.DS_Store',
    'dist',
    '*.log'
  ],
  logLevel: 'info'              // 'info', 'debug', 'silent'
});
```

---

## 🔍 Arquivos Monitorados

### Diretórios Rastreados
```
backend/src/
├── server.js ⭐ (simbólico)
├── brain/
│   └── EnterpriseBrain.js ⭐
├── core/
│   └── EnterpriseCore.js ⭐
├── middleware/
│   ├── authMiddleware.js ⭐
│   ├── sessionMiddleware.js ⭐
│   └── errorHandler.js ⭐
├── routes/
│   ├── authRoutes.js ⭐
│   ├── blogRoutes.js ⭐
│   ├── dictionaryRoutes.js ⭐
│   ├── userRoutes.js ⭐
│   └── adminRoutes.js ⭐
└── utils/
    ├── KeyManager.js ⭐
    ├── DataScraper.js ⭐
    └── AccessControlDashboard.js ⭐

frontend/pages/
├── *.html (mudanças detectadas)
└── (auto-reload no browser)

frontend/assets/js/
└── *.js (mudanças detectadas)

frontend/assets/css/
└── *.css (mudanças detectadas)
```

### Tipos de Mudanças

| Tipo | Behavior |
|------|----------|
| **Arquivo Simbólico** | Auto-restart imediato |
| **Arquivo Crítico** (.js, .html, .css, .json) | Auto-restart agendado |
| **Outro arquivo** | Apenas log, sem restart |

---

## 📊 Estatísticas do Servidor

Pressione **s** para ver:

```javascript
{
  "isRunning": true,
  "pid": 12345,
  "restartCount": 2,
  "statistics": {
    "startTime": "2026-03-01T14:23:45.000Z",
    "restarts": 2,
    "crashes": 0,
    "errors": [],
    "uptime": 456,  // segundos
    "bytesOutput": 15234
  },
  "watcher": {
    "status": "active",
    "uptime": 450,
    "statistics": {
      "startedAt": "2026-03-01T14:23:45.000Z",
      "changesDetected": 3,
      "restarts": 2,
      "errors": 0
    },
    "watchedDirectories": [
      "backend/src",
      "frontend/pages",
      "frontend/assets/js",
      "frontend/assets/css"
    ],
    "symbolicFilesMonitored": 13
  }
}
```

---

## 🛑 Finalizar Servidor

### Opção 1: Pressionar "q" (modo interativo)
```
q + Enter → Graceful shutdown
```

### Opção 2: Ctrl+C (padrão)
```
Ctrl+C → SIGINT → Graceful shutdown
```

### Resultado:
```
============================================================
🛑 Recebido sinal: SIGINT
⏹️  Finalizando servidor...
============================================================

============================================================
📊 ESTATÍSTICAS DO SERVIDOR
============================================================
⏱️  Uptime: 1245s
🔄 Restarts: 2
💥 Crashes: 0
❌ Erros capturados: 0
📤 Bytes de output: 15234
============================================================
```

---

## ⚠️ Tratamento de Erros

### Cenários de Erro Tratados

| Cenário | Ação |
|---------|------|
| **SyntaxError** | Log, restart, retry |
| **Module not found** | Log, restart, retry |
| **Port in use** | Log, retry |
| **Database connection error** | Log, recover, retry |
| **Too many restarts** | Stop, alert user |
| **Process killed** | Detect, restart |
| **Uncaught exception** | Log, restart |

### Limite de Restarts

```javascript
if (restartCount >= maxRestarts) {
  // Para de tentar reiniciar
  // Exibe mensagem ao usuário
  // Requer reinicialização manual
}

// Padrão: maxRestarts = 5
// Mensagem: "Máximo de restarts atingido. Corrija os erros manualmente."
```

---

## 🔧 Troubleshooting

### Servidor fecha imediatamente
```
❌ Problema: Processo fecha logo após iniciar
✅ Solução:
   1. Verifique logs (output no console)
   2. Verifique erros de sintaxe: node -c backend/src/server.js
   3. Verifique dependências: npm install --legacy-peer-deps
   4. Verifique variáveis .env
```

### Não está detectando mudanças
```
❌ Problema: Arquivo mudou mas servidor não reiniciou
✅ Solução:
   1. Verifique se arquivo está em um diretório monitorado
   2. Verifique se arquivo não está em ignorePatterns
   3. Pressione 'r' para forçar restart manual
   4. Verifique se FileWatcher iniciou (log "FileWatcher ativo")
```

### Muitos restarts
```
❌ Problema: Servidor reinicia constantemente
✅ Solução:
   1. Revise os erros nos logs
   2. Verifique o código modificado
   3. Pressionando 's' vê quantos restarts ocorreram
   4. Se > 5, precisará iniciar novamente
```

### Porta 3000 já em uso
```
❌ Problema: EADDRINUSE: address already in use :::3000
✅ Solução:
   1. start-dev.bat já trata isso (limpa processos antigos)
   2. Ou manuais: taskkill /F /IM node.exe
   3. Ou teste outra porta: set PORT=3001
```

---

## 💡 Dicas de Desenvolvimento

### Workflow Recomendado
1. Execute `.\start-dev.bat` e deixe rodando
2. Salve arquivo → Auto-restart automático ✨
3. Se precisar restart manual → Pressione **r**
4. Para ver status → Pressione **s**
5. Para sair graciosamente → Pressione **q**

### Boas Práticas
- ✅ Sempre salve uma mudança por vez (menos restarts)
- ✅ Verifique logs para erros de sintaxe
- ✅ Não feche o terminal (deixe rodando)
- ✅ Use Ctrl+C para parar graciosamente

### Performance
- 🚀 Restart rápido (~1-2 segundos)
- 💾 Watch de apenas arquivos simbólicos
- 📊 Debounce de 500ms agrupa mudanças rápidas
- ⚡ Zero overhead quando nada muda

---

## 📚 Relacionado

- [DATAFLOW_GUIDE.md](DATAFLOW_GUIDE.md) - Fluxo de dados da plataforma
- [QUICKSTART.md](QUICKSTART.md) - Guia de início rápido
- [README.md](README.md) - Documentação geral

---

## 🎓 Exemplo Prático

### Cenário: Modificar rota de admin

1. Deixe o servidor rodando:
```bash
.\start-dev.bat
[Log esperado: "✅ Servidor está pronto..."]
```

2. Abra `backend/src/routes/adminRoutes.js`

3. Faça uma mudança simples (adicione um console.log)

4. Salve o arquivo

5. Veja nos logs:
```
[14:25:12] 📝 Arquivo modificado: backend/src/routes/adminRoutes.js
[14:25:12] 🔴 ARQUIVO SIMBÓLICO alterado! Restart necessário...

🔄 REINICIANDO SERVIDOR (1/5)
Motivo: symbolic-file-changed
Timestamp: 01/03/2026 14:25:13

[14:25:14] ✅ Processo iniciado com PID: 12346
✅ Servidor está pronto. Observando alterações...
```

6. Atualize o navegador → mudanças estão vivas! 🎉

---

Este sistema mantém seu servidor sempre vivo e atualizado enquanto você desenvolve! 🚀
