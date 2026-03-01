# 🚀 GUIA RÁPIDO - SERVIDOR ROBUSTO

## ⚡ Início Rápido

### Windows
```bash
# 1. Abra PowerShell
# 2. Navegue até a pasta do projeto
cd "c:\Users\seu-usuario\OneDrive\.Projetos\...\enterprise-course"

# 3. Execute
.\start-dev.bat

# 4. Aguarde a mensagem "✅ Servidor está pronto"
# 5. Abra navegador: http://localhost:3000
```

### Linux/Mac
```bash
chmod +x start-dev-linux.sh
./start-dev-linux.sh
```

### npm Direto
```bash
npm install --legacy-peer-deps  # Se necessário
npm run dev
```

---

## 🎮 Controles

Durante a execução do servidor:

| Entrada | Ação |
|---------|------|
| **r** + Enter | Reinicia servidor |
| **s** + Enter | Mostra status/estatísticas |
| **q** + Enter | Encerra graciosamente |
| **Ctrl+C** | Parar (graceful shutdown) |

---

## 📍 Diretórios Monitorados

```
✅ Monitora AUTOMATICAMENTE:
  • backend/src/         (rotas, middleware, utils)
  • frontend/pages/      (HTML)
  • frontend/assets/js/  (JavaScript)
  • frontend/assets/css/ (CSS)

🔴 RESTART IMEDIATO ao salvar:
  • server.js
  • Todas as rotas:      authRoutes, blogRoutes, ...
  • Todos os middlewares
  • Utils:               KeyManager, DataScraper, ...
  • EnterpriseBrain.js, EnterpriseCore.js
```

---

## 🔄 Auto-Restart

### O que causa restart automático?

1. **Arquivo simbólico muda** ↔️ Restart IMEDIATAMENTE
2. **Arquivo crítico muda** (.js, .css, .html) ↔️ Restart em ~2s
3. **Servidor crash** ↔️ Restart automático
4. **Tecla "r" pressionada** ↔️ Restart manual

### Exemplo prático

```
# Você edita e salva: backend/src/routes/adminRoutes.js

[14:25:12] 📝 Arquivo modificado: backend/src/routes/adminRoutes.js
[14:25:12] 🔴 ARQUIVO SIMBÓLICO alterado! Restart necessário...

🔄 REINICIANDO SERVIDOR (1/5)
Motivo: symbolic-file-changed
Timestamp: 01/03/26 14:25:13

[14:25:14] ✅ Processo iniciado com PID: 12346
✅ Servidor está pronto. Observando alterações...

# Servidor pronto novamente em ~2 segundos!
# Browser recarrega/reconecta na próxima requisição
```

---

## 📊 Como Ver Status

Pressione **s** no terminal enquanto servidor está rodando:

```json
{
  "isRunning": true,
  "pid": 12345,
  "restartCount": 0,
  "uptime": 234
}
```

**Significado:**
- ✅ `isRunning: true` = Servidor está ativo
- 🔢 `pid:` = ID do processo
- 🔄 `restartCount:` = Quantas vezes reiniciou
- ⏱️ `uptime:` = Segundos rodando

---

## ❌ Se Algo Der Errado

### Servidor fechou imediatamente
```
❌ Causa: Erro de sintaxe ou dependência ausente
✅ Solução:
   1. Veja a mensagem de erro no console
   2. Corrija o código
   3. Execute novamente: .\start-dev.bat
```

### Porta 3000 já em uso
```
❌ Causa: Outro Node.js rodando na porta 3000
✅ Solução (automatizada):
   • start-dev.bat já matará processos antigos
   • Se não funcionar: set PORT=3001 (mude porta)
```

### Arquivo salvo mas não reiniciou
```
❌ Causa: Arquivo não está no diretório monitorado
✅ Solução:
   • Pressione 'r' para restart manual
   • Verifique se arquivo está em backend/src ou frontend/
```

### Muitos restarts seguidos (>5)
```
❌ Causa: Erro de sintaxe causa loop de restarts
✅ Solução:
   1. Servidor vai parar após 5 restarts
   2. Corrija o código no editor
   3. Execute novamente: .\start-dev.bat
```

---

## 💡 Workflow Recomendado

### 1. Inicie uma vez
```bash
.\start-dev.bat
# Deixe rodando, NÃO feche a janela
```

### 2. Abra navegador
```
http://localhost:3000
```

### 3. Edite código
```
Abra VS Code e faça mudanças
Salve arquivo (Ctrl+S)
Servidor reinicia AUTOMATICAMENTE
Página browser atualiza/reconecta
```

### 4. Veja mudanças ao vivo! ✨

### 5. Se precisar reiniciar manualmente
```
Pressione 'r' no terminal
```

### 6. Para encerrar
```
Pressione 'q' OU Ctrl+C
```

---

## 🔍 Monitoramento

O servidor monitora **13 arquivos críticos**:

```
✅ Arquivo Principal
   └─ backend/src/server.js

✅ Rotas (4 arquivos)
   ├─ authRoutes.js
   ├─ blogRoutes.js
   ├─ dictionaryRoutes.js
   ├─ userRoutes.js
   └─ adminRoutes.js

✅ Middleware (3 arquivos)
   ├─ authMiddleware.js
   ├─ sessionMiddleware.js
   └─ errorHandler.js

✅ Core (2 arquivos)
   ├─ EnterpriseBrain.js
   └─ EnterpriseCore.js

✅ Utils (3 arquivos)
   ├─ KeyManager.js
   ├─ DataScraper.js
   └─ AccessControlDashboard.js
```

Se algum desses mudar → **Restart automático** ✨

---

## 🛑 Finalizar Servidor

### Opção 1: Graceful (Recomendado)
```
Pressione 'q' + Enter
OU Ctrl+C
```

Resultado:
```
🛑 Recebido sinal: SIGINT
⏹️  Finalizando servidor...

📊 ESTATÍSTICAS DO SERVIDOR
⏱️  Uptime: 1245s
🔄 Restarts: 2
💥 Crashes: 0
```

### Opção 2: Fechar janela
```
Clicar X no console
(menos graceful)
```

---

## 📝 Exemplos de Desenvolvimento Real

### Exemplo 1: Adicionar nova rota

```
1. Abra backend/src/routes/customRoutes.js
2. Edite...
3. Salve (Ctrl+S)
   
   [14:30:00] 📝 Arquivo modificado: backend/src/routes/customRoutes.js
   [14:30:00] 🟡 Arquivo crítico alterado
   
   🔄 REINICIANDO SERVIDOR (1/5)
   
   [14:30:02] ✅ Servidor pronto!

4. Browser automaticamente conecta à nova rota
5. Pronto! Nova funcionalidade ao vivo
```

### Exemplo 2: Corrigir erro de sintaxe

```
1. Edite um arquivo (ex: authRoutes.js)
2. Introduza erro: remova um { ou )
3. Salve
   
   [14:32:00] 📝 Arquivo modificado
   [14:32:00] 🔴 ARQUIVO SIMBÓLICO alterado
   
   🔄 REINICIANDO SERVIDOR (1/5)
   
   [14:32:01] ❌ [STDERR] SyntaxError: Unexpected token }
   
   ⏳ Aguardando 2000ms antes do restart...
   
   [14:32:03] 🔄 REINICIANDO SERVIDOR (2/5)

4. Consuma o erro no editor
5. Salve novamente
   
   ✅ Servidor online novamente!
```

### Exemplo 3: Crash do servidor

```
1. Código tem erro lógico (não sintaxe)
2. Servidor inicia, mas depois crashes
   
   [14:35:00] ✅ Servidor iniciado
   [14:35:02] ❌ TypeError: Cannot read property 'routes'
   [14:35:02] ❌ Servidor crashed com código: 1
   
   🔄 REINICIANDO SERVIDOR (1/5)
   
3. ServerBootstrap detecta e reinicia
4. Você vê logs de erro
5. Corrija e salve
   
   ✅ Novo restart automático
```

---

## 🎯 Casos de Uso

| Caso | Solução |
|------|---------|
| Trabalho normal | `.\start-dev.bat` e deixe rodando |
| Recompile CSS | Salva → Auto-restart (~2s) |
| Novo endpoint | Salva → Auto-restart (~2s) |
| Erro de sintaxe | Vê erro nos logs → Corrija → Auto-restart |
| Crash não-sintaxe | Auto-restart automático |
| Precisa forçar | Pressione 'r' |
| Encerrar | Pressione 'q' ou Ctrl+C |

---

## ⚡ Performance

- ⚙️ Restart: ~1-2 segundos
- 🚀 Zero overhead quando nada muda
- 📊 Debounce: agrupa mudanças rápidas
- 💾 Watch: apenas arquivos simbólicos

---

## 📚 Documentação Completa

Para detalhes avançados, veja: **SERVER_ROBUSTNESS.md**

---

**Pronto para desenvolver! 🚀**

Deixe o servidor rodando e foque no código.
Mudanças são aplicadas automaticamente!
