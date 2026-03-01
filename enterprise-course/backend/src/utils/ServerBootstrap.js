/**
 * ServerBootstrap.js - Inicializador Robusto com Auto-Restart
 * 
 * Responsável por:
 * - Iniciar o servidor com tratamento de erros robusto
 * - Recuperação automática de falhas
 * - Integração com FileWatcher para auto-restart
 * - Manutenção do servidor sempre ativo
 * - Logs detalhados de operações
 * 
 * 📍 FLUXO: Start → Monitor → Error → Recover → Restart
 * 
 * @author Enterprise Course Platform
 */

const { spawn } = require('child_process');
const path = require('path');
const FileWatcher = require('./FileWatcher');

class ServerBootstrap {
  constructor(options = {}) {
    this.options = {
      port: process.env.PORT || 3000,
      scriptPath: options.scriptPath || './backend/src/server.js',
      maxRestarts: options.maxRestarts || 5,
      restartCooldown: options.restartCooldown || 2000, // ms
      watchFiles: options.watchFiles !== false,
      enableLogging: options.enableLogging !== false
    };

    // Estado do servidor
    this.serverProcess = null;
    this.isRunning = false;
    this.restartCount = 0;
    this.lastRestartTime = null;
    this.startTime = new Date();

    // FileWatcher
    this.watcher = new FileWatcher({
      logLevel: this.options.enableLogging ? 'info' : 'silent'
    });

    // Estatísticas
    this.stats = {
      startTime: new Date(),
      restarts: 0,
      crashes: 0,
      errors: [],
      uptime: 0,
      bytesOutput: 0
    };

    // Configurar listeners do watcher
    this.setupWatcherListeners();
  }

  /**
   * Inicia o servidor
   * 📍 FLUXO: Bootstrap.start() → Spawn process → Monitor output → Listen events
   */
  start() {
    this.log('\n' + '='.repeat(60));
    this.log('🚀 Enterprise Course Platform - Servidor Iniciando');
    this.log('='.repeat(60) + '\n');

    this.log(`⚙️  Configurações:`);
    this.log(`   Porta: ${this.options.port}`);
    this.log(`   Script: ${this.options.scriptPath}`);
    this.log(`   Watch Files: ${this.options.watchFiles ? 'SIM' : 'NÃO'}`);

    // Inicia o servidor Node.js
    this.spawn();

    // Inicia file watcher se habilitado
    if (this.options.watchFiles) {
      this.watcher.start();
    }

    // Listeners globais
    this.setupGlobalListeners();

    this.log('\n✅ Servidor está pronto. Observando alterações...\n');
  }

  /**
   * Spawn do processo do servidor
   * 📍 Para onde: Cria novo proceso Node → stdout/stderr → Monitora
   */
  spawn() {
    if (this.serverProcess) {
      try {
        this.serverProcess.kill();
      } catch (e) {
        // Ignorar erro se já foi finalizado
      }
    }

    this.log(`\n🔧 Iniciando novo processo do servidor...`);
    this.lastRestartTime = Date.now();

    // Spawn o processo do servidor
    this.serverProcess = spawn('node', [this.options.scriptPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    });

    const pid = this.serverProcess.pid;
    this.log(`✅ Processo iniciado com PID: ${pid}`);
    this.isRunning = true;

    // Stdout
    this.serverProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(output);
        this.stats.bytesOutput += data.length;
      }
    });

    // Stderr
    this.serverProcess.stderr.on('data', (data) => {
      const error = data.toString().trim();
      if (error) {
        console.error('❌ [STDERR]', error);
        this.stats.errors.push({
          timestamp: new Date(),
          message: error
        });
        this.stats.bytesOutput += data.length;
      }
    });

    // Eventos do processo
    this.serverProcess.on('error', (error) => {
      this.log(`\n❌ Erro ao iniciar processo: ${error.message}`, 'error');
      this.stats.crashes++;
      this.isRunning = false;
      this.attemptRestart('process-error');
    });

    this.serverProcess.on('exit', (code, signal) => {
      this.isRunning = false;
      
      if (code === 0) {
        this.log(`\n✅ Servidor finalizado com sucesso (exit code: ${code})`);
      } else if (code === null && signal) {
        this.log(`\n⚠️  Servidor finalizado pelo sinal: ${signal}`);
      } else {
        this.log(`\n❌ Servidor crashed com código de erro: ${code}`, 'error');
        this.stats.crashes++;
        this.attemptRestart('process-crash');
      }
    });

    this.log(`📊 Process PID: ${pid}`);
  }

  /**
   * Tenta fazer restart do servidor
   * 📍 FLUXO: Erro/Mudança detectada → Check cooldown → Spawn novo → Monitor
   */
  attemptRestart(reason) {
    // Verifica limite de restarts
    if (this.restartCount >= this.options.maxRestarts) {
      this.log(
        `\n❌ Máximo de restarts atingido (${this.options.maxRestarts}). Não reiniciando mais.`,
        'error'
      );
      this.log(`⚠️  Corrija os erros manualmente e reinicie o servidor.`);
      return;
    }

    // Verifica cooldown
    const timeSinceLastRestart = Date.now() - this.lastRestartTime;
    if (timeSinceLastRestart < this.options.restartCooldown) {
      this.log(
        `⏳ Aguardando ${this.options.restartCooldown}ms antes do restart...`
      );
      setTimeout(() => this.attemptRestart(reason), this.options.restartCooldown);
      return;
    }

    this.restartCount++;
    this.stats.restarts++;

    this.log(`\n${'='.repeat(60)}`);
    this.log(`🔄 REINICIANDO SERVIDOR (${this.restartCount}/${this.options.maxRestarts})`);
    this.log(`Motivo: ${reason}`);
    this.log(`Timestamp: ${new Date().toLocaleString('pt-BR')}`);
    this.log(`${'='.repeat(60)}\n`);

    // Aguarda um pouco e inicia novo processo
    setTimeout(() => this.spawn(), this.options.restartCooldown);
  }

  /**
   * Reset de contadores de restart (após sucesso)
   */
  resetRestartCount() {
    if (this.isRunning && this.serverProcess) {
      if (this.restartCount > 0) {
        this.log(`✅ Servidor em execução. Reset de contadores de restart.`);
        this.restartCount = 0;
      }
    }
  }

  /**
   * Configura listeners do FileWatcher
   */
  setupWatcherListeners() {
    // Arquivo simbólico mudou
    this.watcher.on('symbolic-file-changed', (event) => {
      this.log(`\n🔴 ARQUIVO SIMBÓLICO ALTERADO: ${event.file}`);
      this.log(`📍 Auto-restart em 2s...`);
      setTimeout(() => this.attemptRestart('symbolic-file-changed'), 2000);
    });

    // Arquivo crítico mudou
    this.watcher.on('critical-file-changed', (event) => {
      this.log(`\n🟡 Arquivo crítico alterado: ${event.file}`);
      this.log(`   Auto-restart agendado...`);
      this.attemptRestart('critical-file-changed');
    });

    // Restart solicitado
    this.watcher.on('restart-requested', (event) => {
      this.log(`\n↺ Restart solicitado pelo FileWatcher`);
      this.log(`  Motivo: ${event.reason}`);
      this.attemptRestart(`watcher-request:${event.reason}`);
    });

    this.watcher.on('started', () => {
      this.log(`✅ FileWatcher iniciado e monitorando alterações`);
    });

    this.watcher.on('stopped', () => {
      this.log(`🛑 FileWatcher parado`);
    });
  }

  /**
   * Configura listeners globais (SIGINT, SIGTERM, etc)
   */
  setupGlobalListeners() {
    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));

    // Exception não capturada
    process.on('uncaughtException', (error) => {
      this.log(`\n❌ Uncaught Exception: ${error.message}`, 'error');
      this.stats.errors.push({
        timestamp: new Date(),
        type: 'uncaught-exception',
        message: error.message,
        stack: error.stack
      });
    });

    // Promise rejection não capturada
    process.on('unhandledRejection', (reason, promise) => {
      this.log(`\n❌ Unhandled Rejection: ${reason}`, 'error');
      this.stats.errors.push({
        timestamp: new Date(),
        type: 'unhandled-rejection',
        message: String(reason)
      });
    });

    // Periodicamente verifica se servidor está saudável
    setInterval(() => {
      if (!this.isRunning && !this.serverProcess?.killed) {
        this.log(`⚠️  Servidor não está respondendo. Tentando recuperar...`);
        this.attemptRestart('health-check');
      }
      this.resetRestartCount();
    }, 5000);
  }

  /**
   * Shutdown gracioso
   */
  shutdown(signal) {
    this.log(`\n\n${'='.repeat(60)}`);
    this.log(`🛑 Recebido sinal: ${signal}`);
    this.log(`⏹️  Finalizando servidor...`);
    this.log(`${'='.repeat(60)}\n`);

    // Para o watcher
    if (this.watcher) {
      this.watcher.stop();
    }

    // Mata o processo do servidor
    if (this.serverProcess && !this.serverProcess.killed) {
      this.serverProcess.kill('SIGTERM');
      
      // Force kill após 5s
      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 5000);
    }

    // Exibe estatísticas finais
    this.printStats();

    // Aguarda e finaliza
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }

  /**
   * Imprime estatísticas
   */
  printStats() {
    const uptime = Math.round((Date.now() - this.startTime) / 1000);
    
    this.log(`\n${'='.repeat(60)}`);
    this.log(`📊 ESTATÍSTICAS DO SERVIDOR`);
    this.log(`${'='.repeat(60)}`);
    this.log(`⏱️  Uptime: ${uptime}s`);
    this.log(`🔄 Restarts: ${this.stats.restarts}`);
    this.log(`💥 Crashes: ${this.stats.crashes}`);
    this.log(`❌ Erros capturados: ${this.stats.errors.length}`);
    this.log(`📤 Bytes de output: ${this.stats.bytesOutput}`);
    this.log(`${'='.repeat(60)}\n`);
  }

  /**
   * Log com timestamp
   */
  log(message, level = 'info') {
    if (!this.options.enableLogging) return;

    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const prefix = `[${timestamp}]`;

    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Retorna status do servidor
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      pid: this.serverProcess?.pid || null,
      restartCount: this.restartCount,
      statistics: this.stats,
      watcher: this.watcher.getStatus(),
      uptime: Math.round((Date.now() - this.startTime) / 1000)
    };
  }

  /**
   * Força restart manual
   */
  forceRestart(reason = 'manual-request') {
    this.log(`\n📍 Restart manual solicitado`);
    this.attemptRestart(reason);
  }
}

// Se executado diretamente
if (require.main === module) {
  const bootstrap = new ServerBootstrap({
    scriptPath: './backend/src/server.js',
    watchFiles: true,
    enableLogging: true,
    maxRestarts: 5,
    restartCooldown: 2000
  });

  bootstrap.start();

  // Permite interação via console
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.on('data', (key) => {
      const input = key.toString();
      
      if (input === 'r') {
        bootstrap.forceRestart('user-manual');
      } else if (input === 's') {
        console.log('\n' + JSON.stringify(bootstrap.getStatus(), null, 2));
      } else if (input === 'q') {
        bootstrap.shutdown('MANUAL');
      }
    });

    console.log('\n💡 Atalhos de teclado:');
    console.log('   r - Reiniciar servidor manualmente');
    console.log('   s - Ver status');
    console.log('   q - Sair\n');
  }
}

module.exports = ServerBootstrap;
