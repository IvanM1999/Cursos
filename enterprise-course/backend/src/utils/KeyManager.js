/**
 * KeyManager.js - Sistema de Gerenciamento de Chaves e Credenciais
 * 
 * Responsável por:
 * - Registrar todas as chaves (API, JWT, BD, etc)
 * - Criptografar/descriptografar chaves sensíveis
 * - Auditar acessos às chaves
 * - Rotacionar chaves periodicamente
 * 
 * @author Enterprise Course Platform
 */

const crypto = require('crypto');

class KeyManager {
  constructor() {
    // Armazena todas as chaves registradas com timestamp
    this.keys = new Map();
    
    // Log de acessos às chaves
    this.accessLog = [];
    
    // Chaves pré-registradas do sistema
    this.registerSystemKeys();
  }

  /**
   * Registra as chaves do sistema do arquivo .env
   * Encaminha para: Variáveis de Ambiente → KeyManager → Cache
   */
  registerSystemKeys() {
    const keysToRegister = {
      'JWT_SECRET': {
        value: process.env.JWT_SECRET || 'seu-jwt-secret-aqui',
        type: 'authentication',
        sensitive: true,
        expiresIn: 7776000000, // 90 dias em ms
        createdAt: new Date()
      },
      'DB_MONGODB_URI': {
        value: process.env.DB_MONGODB_URI || 'mongodb://localhost:27017/enterprise-course',
        type: 'database',
        sensitive: true,
        expiresIn: null,
        createdAt: new Date()
      },
      'DB_POSTGRESQL_URL': {
        value: process.env.DB_POSTGRESQL_URL || 'postgres://user:password@localhost:5432/enterprise',
        type: 'database',
        sensitive: true,
        expiresIn: null,
        createdAt: new Date()
      },
      'SESSION_SECRET': {
        value: process.env.SESSION_SECRET || 'sua-session-secret-aqui',
        type: 'session',
        sensitive: true,
        expiresIn: 2592000000, // 30 dias
        createdAt: new Date()
      },
      'API_RATE_LIMIT': {
        value: process.env.API_RATE_LIMIT || '100',
        type: 'configuration',
        sensitive: false,
        expiresIn: null,
        createdAt: new Date()
      },
      'ADMIN_API_KEY': {
        value: process.env.ADMIN_API_KEY || this.generateApiKey(),
        type: 'api',
        sensitive: true,
        expiresIn: 15552000000, // 180 dias
        createdAt: new Date()
      }
    };

    Object.entries(keysToRegister).forEach(([name, config]) => {
      this.register(name, config);
    });
  }

  /**
   * Registra uma nova chave no sistema
   * 📍 FLUXO: Função de Registro → KeyManager.keys (Map) → Log de Auditoria
   * 
   * @param {string} name - Nome da chave
   * @param {object} config - Configuração { value, type, sensitive, expiresIn }
   */
  register(name, config) {
    const keyEntry = {
      ...config,
      id: this.generateKeyId(),
      registered_at: new Date(),
      last_accessed: null,
      access_count: 0,
      encrypted: config.sensitive ? this.encrypt(config.value) : config.value,
      is_encrypted: config.sensitive
    };

    this.keys.set(name, keyEntry);
    
    // Log de auditoria (para onde: Audit Log System)
    this.logAudit('KEY_REGISTERED', {
      key_name: name,
      key_type: config.type,
      sensitive: config.sensitive,
      timestamp: new Date()
    });

    console.log(`✅ Chave registrada: ${name} (${config.type})`);
  }

  /**
   * Recupera uma chave e registra o acesso
   * 📍 FLUXO: Get → Descriptografa → Log de Acesso → Retorna Valor
   * 
   * @param {string} name - Nome da chave
   * @param {object} requester - { userId, requestType, ip }
   * @returns {string} Valor da chave descriptografado
   */
  get(name, requester = {}) {
    const keyEntry = this.keys.get(name);
    
    if (!keyEntry) {
      this.logAudit('KEY_NOT_FOUND', { key_name: name, requester });
      throw new Error(`❌ Chave não encontrada: ${name}`);
    }

    // Verifica se a chave expirou
    if (keyEntry.expiresIn && Date.now() - keyEntry.registered_at > keyEntry.expiresIn) {
      this.logAudit('KEY_EXPIRED', { key_name: name, requester });
      throw new Error(`⚠️ Chave expirada: ${name}`);
    }

    // Atualiza estatísticas de acesso
    keyEntry.last_accessed = new Date();
    keyEntry.access_count++;

    // Log de acesso detalhado (para onde: Data Flow Registry)
    this.logAccess(name, requester);

    // Descriptografa se necessário
    const value = keyEntry.is_encrypted ? this.decrypt(keyEntry.encrypted) : keyEntry.encrypted;
    return value;
  }

  /**
   * Lista todas as chaves registradas (sem valores sensíveis)
   * 📍 FLUXO: ListKeys → Filter → Metadata Only → Dashboard
   * 
   * @returns {array} Lista de chaves com metadados (sem valores)
   */
  listKeys() {
    const keys = [];
    this.keys.forEach((value, name) => {
      keys.push({
        name,
        type: value.type,
        sensitive: value.sensitive,
        registered_at: value.registered_at,
        last_accessed: value.last_accessed,
        access_count: value.access_count,
        is_expired: value.expiresIn ? (Date.now() - value.registered_at > value.expiresIn) : false
      });
    });
    return keys;
  }

  /**
   * Renova uma chave (rotação de chaves)
   * 📍 FLUXO: Rotação de Chave → Nova Chave → Log → Notificação
   * 
   * @param {string} name - Nome da chave
   * @param {string} newValue - Novo valor da chave
   */
  rotate(name, newValue) {
    const keyEntry = this.keys.get(name);
    
    if (!keyEntry) {
      throw new Error(`Chave não encontrada: ${name}`);
    }

    const oldValue = keyEntry.encrypted;
    keyEntry.encrypted = keyEntry.is_encrypted ? this.encrypt(newValue) : newValue;
    keyEntry.rotated_at = new Date();
    keyEntry.previous_value = oldValue; // Manter para fallback
    keyEntry.access_count = 0;
    keyEntry.last_accessed = null;

    this.logAudit('KEY_ROTATED', {
      key_name: name,
      rotated_at: new Date(),
      previous_access_count: keyEntry.access_count
    });

    console.log(`🔄 Chave renovada: ${name}`);
  }

  /**
   * Registra fluxo de dados
   * 📍 FLUXO PRINCIPAL: API Request → DataFlowRegistry → Audit Log
   * 
   * @param {string} operation - Tipo de operação (READ, CREATE, UPDATE, DELETE)
   * @param {object} data - { source, destination, method, user_id, timestamp }
   */
  logDataFlow(operation, data) {
    const flowEntry = {
      id: this.generateFlowId(),
      operation, // Para onde os dados vão
      source: data.source || 'unknown',
      destination: data.destination || 'database',
      method: data.method || 'unknown',
      user_id: data.user_id,
      timestamp: new Date(),
      data_size: data.data_size || 0,
      duration_ms: data.duration_ms || 0,
      status: data.status || 'pending'
    };

    // Log para o sistema (para onde: Data Flow Registry → Monitoring System)
    this.accessLog.push(flowEntry);

    return flowEntry;
  }

  /**
   * Log de acesso a chaves
   * 📍 FLUXO: Key Access → Access Log → Audit System
   */
  logAccess(keyName, requester) {
    this.accessLog.push({
      type: 'KEY_ACCESS',
      key_name: keyName,
      requester: requester || {},
      timestamp: new Date(),
      ip: requester?.ip || 'unknown',
      user_id: requester?.userId || 'system'
    });
  }

  /**
   * Log de auditoria
   * 📍 FLUXO: Ação → Audit Log → Registros de Compliance
   */
  logAudit(event, data) {
    this.accessLog.push({
      type: 'AUDIT',
      event,
      data,
      timestamp: new Date()
    });
  }

  /**
   * Retorna relatório de fluxo de dados
   * 📍 SAÍDA: Para Dashboard de Controle de Acessos
   */
  getDataFlowReport(filters = {}) {
    const { type, startDate, endDate } = filters;
    
    let filtered = this.accessLog;

    if (type) {
      filtered = filtered.filter(log => log.type === type);
    }

    if (startDate) {
      filtered = filtered.filter(log => log.timestamp >= new Date(startDate));
    }

    if (endDate) {
      filtered = filtered.filter(log => log.timestamp <= new Date(endDate));
    }

    return {
      total_records: filtered.length,
      records: filtered,
      summary: {
        key_accesses: filtered.filter(l => l.type === 'KEY_ACCESS').length,
        audit_events: filtered.filter(l => l.type === 'AUDIT').length,
        data_flows: filtered.filter(l => l.type === 'DATA_FLOW').length
      }
    };
  }

  /**
   * Criptografa um valor sensível
   */
  encrypt(value) {
    if (!value) return value;
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.JWT_SECRET || 'default-secret', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(String(value), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Descriptografa um valor
   */
  decrypt(value) {
    if (!value) return value;
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.JWT_SECRET || 'default-secret', 'salt', 32);
    const parts = value.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Gera um ID único para chaves
   */
  generateKeyId() {
    return 'KEY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Gera um ID único para fluxos de dados
   */
  generateFlowId() {
    return 'FLOW_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Gera uma API Key válida
   */
  generateApiKey() {
    return 'API_' + crypto.randomBytes(32).toString('hex');
  }

  /**
   * Retorna status do KeyManager
   */
  getStatus() {
    return {
      total_keys: this.keys.size,
      total_log_entries: this.accessLog.length,
      keys: this.listKeys(),
      recent_access: this.accessLog.slice(-10)
    };
  }
}

// Exporta instância única (Singleton)
module.exports = new KeyManager();
