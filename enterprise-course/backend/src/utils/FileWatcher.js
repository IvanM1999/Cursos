/**
 * FileWatcher.js - Monitor de Alterações de Arquivos em Tempo Real
 * 
 * Responsável por:
 * - Monitorar arquivos do projeto
 * - Detectar mudanças automáticamente
 * - Notificar sobre mudanças
 * - Iniciar re-start do servidor quando necessário
 * 
 * 📍 FLUXO: Arquivo mudou → FileWatcher deteta → Notifica → Server restart
 * 
 * @author Enterprise Course Platform
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class FileWatcher extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configurações
    this.options = {
      debounceTime: options.debounceTime || 500, // ms para agrupar mudanças rápidas
      recursiveWatch: options.recursiveWatch !== false,
      ignorePatterns: options.ignorePatterns || [
        'node_modules',
        '.env.local',
        '.DS_Store',
        'dist',
        'build',
        '.git',
        '*.log',
        'package-lock.json'
      ],
      logLevel: options.logLevel || 'info' // info, debug, silent
    };

    // Arquivos simbólicos a monitorar (core projeto)
    this.symbolicFiles = [
      'backend/src/server.js',
      'backend/src/brain/EnterpriseBrain.js',
      'backend/src/core/EnterpriseCore.js',
      'backend/src/middleware/authMiddleware.js',
      'backend/src/middleware/sessionMiddleware.js',
      'backend/src/middleware/errorHandler.js',
      'backend/src/routes/authRoutes.js',
      'backend/src/routes/blogRoutes.js',
      'backend/src/routes/dictionaryRoutes.js',
      'backend/src/routes/userRoutes.js',
      'backend/src/routes/adminRoutes.js',
      'backend/src/utils/KeyManager.js',
      'backend/src/utils/DataScraper.js',
      'backend/src/utils/AccessControlDashboard.js'
    ];

    // Diretórios a monitorar
    this.watchDirs = [
      'backend/src',
      'frontend/pages',
      'frontend/assets/js',
      'frontend/assets/css'
    ];

    // Watchers ativos
    this.watchers = new Map();

    // Debounce timers
    this.debounceTimers = new Map();

    // Estatísticas
    this.stats = {
      startedAt: new Date(),
      changesDetected: 0,
      restarts: 0,
      errors: 0
    };

    // Callback para restart
    this.onRestartCallback = null;
  }

  /**
   * Inicia monitoramento de arquivos
   * 📍 FLUXO: Setup → Watch directories → Listen to changes
   */
  start(baseDir = '.') {
    this.log('🔍 Iniciando FileWatcher...');
    this.log(`📁 Monitorando diretórios: ${this.watchDirs.join(', ')}`);
    this.log(`📄 Arquivos simbólicos: ${this.symbolicFiles.length}`);

    // Monitora cada diretório
    this.watchDirs.forEach(dir => {
      const fullPath = path.join(baseDir, dir);
      
      if (!fs.existsSync(fullPath)) {
        this.log(`⚠️  Diretório não encontrado: ${fullPath}`, 'warn');
        return;
      }

      this.watchDirectory(fullPath, dir);
    });

    this.log('✅ FileWatcher ativo');
    this.emit('started');
  }

  /**
   * Monitora um diretório recursivamente
   */
  watchDirectory(fullPath, displayPath) {
    try {
      const watcher = fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return;

        // Ignora padrões
        if (this.shouldIgnore(filename)) {
          return;
        }

        const filePath = path.join(displayPath, filename);
        this.handleFileChange(eventType, filePath);
      });

      this.watchers.set(displayPath, watcher);
      this.log(`📂 Monitorando: ${displayPath}`);
    } catch (error) {
      this.log(`❌ Erro ao iniciar watcher em ${displayPath}: ${error.message}`, 'error');
      this.stats.errors++;
    }
  }

  /**
   * Verifica se arquivo deve ser ignorado
   */
  shouldIgnore(filename) {
    return this.options.ignorePatterns.some(pattern => {
      if (pattern.includes('*')) {
        // Pattern com wildcard
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filename);
      }
      return filename.includes(pattern);
    });
  }

  /**
   * Processa mudança de arquivo
   * 📍 Para onde: Arquivo mudou → Debounce → Valida se é simbólico → Notifica
   */
  handleFileChange(eventType, filePath) {
    // Debounce: agrupa múltiplas mudanças rápidas
    if (this.debounceTimers.has(filePath)) {
      clearTimeout(this.debounceTimers.get(filePath));
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      
      const fileExt = path.extname(filePath);
      const isSymbolic = this.isSymbolicFile(filePath);
      const isCritical = ['.js', '.html', '.css', '.json'].includes(fileExt);

      this.stats.changesDetected++;

      this.log(`📝 Arquivo modificado: ${filePath}`);
      
      if (isSymbolic) {
        this.log(`🔴 ARQUIVO SIMBÓLICO alterado! Restart necessário...`, 'warn');
        this.emit('symbolic-file-changed', { file: filePath, isSymbolic: true });
        this.scheduleRestart('symbolic-file-changed');
      } else if (isCritical) {
        this.log(`🟡 Arquivo crítico alterado: ${filePath}`);
        this.emit('critical-file-changed', { file: filePath });
        this.scheduleRestart('critical-file-changed');
      } else {
        this.emit('file-changed', { file: filePath });
      }
    }, this.options.debounceTime);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Verifica se é arquivo simbólico
   */
  isSymbolicFile(filePath) {
    return this.symbolicFiles.some(symbFile => 
      filePath.includes(symbFile.replace(/\\/g, '/'))
    );
  }

  /**
   * Agenda restart do servidor
   * 📍 FLUXO: Detecção → Debounce → Schedule → Callback
   */
  scheduleRestart(reason) {
    if (this.restartScheduled) {
      this.log('⏳ Restart já agendado, ignorando novo...', 'debug');
      return;
    }

    this.restartScheduled = true;
    
    setTimeout(() => {
      this.log(`🔄 Reiniciando servidor (motivo: ${reason})...`);
      this.stats.restarts++;
      
      if (typeof this.onRestartCallback === 'function') {
        this.onRestartCallback(reason);
      }
      
      this.emit('restart-requested', { reason, timestamp: new Date() });
      this.restartScheduled = false;
    }, 1000); // Aguarda 1s antes de fazer restart
  }

  /**
   * Define callback para quando restart é solicitado
   */
  onRestart(callback) {
    this.onRestartCallback = callback;
  }

  /**
   * Para monitoramento
   */
  stop() {
    this.log('🛑 Parando FileWatcher...');
    
    // Para todos os timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    // Fecha todos os watchers
    this.watchers.forEach((watcher, dir) => {
      watcher.close();
      this.log(`🔓 Watcher fechado: ${dir}`);
    });

    this.watchers.clear();
    this.log('✅ FileWatcher parado');
    this.emit('stopped');
  }

  /**
   * Logs com timestamp
   */
  log(message, level = 'info') {
    if (this.options.logLevel === 'silent') return;
    
    if (level === 'debug' && this.options.logLevel !== 'debug') return;

    const timestamp = new Date().toLocaleTimeString('pt-BR');
    console.log(`[${timestamp}] ${message}`);
  }

  /**
   * Retorna status do watcher
   */
  getStatus() {
    return {
      status: 'active',
      uptime: Math.round((Date.now() - this.stats.startedAt) / 1000),
      statistics: this.stats,
      watchedDirectories: Array.from(this.watchers.keys()),
      symbolicFilesMonitored: this.symbolicFiles.length
    };
  }
}

module.exports = FileWatcher;
