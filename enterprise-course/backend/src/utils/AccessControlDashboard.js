/**
 * AccessControlDashboard.js - Painel de Controle de Acessos e Auditoría
 * 
 * Responsável por:
 * - Monitorar acessos ao sistema
 * - Rastrear fluxo de dados
 * - Relatórios de conformidade
 * - Alertas de segurança
 * - Análise de comportamento de usuários
 * 
 * 📍 FLUXO: Eventos do Sistema → AccessControl → Dashboard → Análise/Alertas
 * 
 * @author Enterprise Course Platform
 */

const KeyManager = require('./KeyManager');

class AccessControlDashboard {
  constructor() {
    // Armazena eventos de acesso
    this.events = [];
    
    // Configurações de controle
    this.config = {
      maxFailedLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutos
      sessionTimeout: 30 * 60 * 1000, // 30 minutos
      monitoringEnabled: true
    };

    // Usuários bloqueados (por falhas de login)
    this.lockedUsers = new Map();

    // Sessões ativas
    this.activeSessions = new Map();

    // Alertas do sistema
    this.alerts = [];

    // Estatísticas
    this.stats = {
      total_logins: 0,
      failed_logins: 0,
      total_operations: 0,
      blocked_operations: 0,
      data_flows: 0
    };
  }

  /**
   * Registra evento de acesso
   * 📍 FLUXO: Requisição → ValidaAcesso → Registra Evento → Log
   * 
   * @param {object} event - { user_id, action, resource, ip, user_agent, timestamp }
   */
  logAccess(event) {
    const eventEntry = {
      id: this.generateEventId(),
      user_id: event.user_id || 'anonymous',
      action: event.action, // login, logout, create, read, update, delete
      resource: event.resource, // blog, user, admin, etc
      ip: event.ip || 'unknown',
      user_agent: event.user_agent || 'unknown',
      timestamp: event.timestamp || new Date(),
      status: event.status || 'success',
      details: event.details || {},
      destination: event.destination || 'database' // Para onde vai o dado
    };

    this.events.push(eventEntry);
    this.stats.total_operations++;

    // Log no KeyManager (para auditoria centralizada)
    KeyManager.logDataFlow(event.action, {
      source: event.source || 'api',
      destination: eventEntry.destination,
      method: event.action,
      user_id: eventEntry.user_id,
      status: eventEntry.status,
      data_size: event.data_size || 0
    });

    // Verifica se precisa gerar alerta
    this.checkForAlerts(eventEntry);

    return eventEntry;
  }

  /**
   * Verifica acesso de usuário (autenticação)
   * 📍 FLUXO: Tentativa de Login → Verifica Bloqueio → Verifica Credenciais → Cria Sessão
   * 
   * @param {string} userId - ID do usuário
   * @param {string} ip - IP da requisição
   * @returns {object} { allowed: boolean, reason: string }
   */
  checkUserAccess(userId, ip = 'unknown') {
    // Verifica se usuário está bloqueado
    if (this.isUserLocked(userId)) {
      this.stats.blocked_operations++;
      return {
        allowed: false,
        reason: 'USER_LOCKED_TOO_MANY_ATTEMPTS',
        unlock_time: this.lockedUsers.get(userId).unlock_at
      };
    }

    // Autorizado
    return {
      allowed: true,
      reason: 'AUTHORIZED'
    };
  }

  /**
   * Registra tentativa de login
   * 📍 FLUXO: Login Attempt → Valida → Registra → Cria Sessão ou Bloqueia
   */
  recordLoginAttempt(userId, ip, success = false) {
    const key = `${userId}:${ip}`;
    
    if (success) {
      this.stats.total_logins++;
      // Remove tentativas falhadas ao fazer login com sucesso
      if (this.lockedUsers.has(key)) {
        this.lockedUsers.delete(key);
      }

      // Cria sessão
      this.createSession(userId, ip);

      this.logAccess({
        user_id: userId,
        action: 'login',
        resource: 'auth',
        ip,
        status: 'success',
        destination: 'session_storage'
      });
    } else {
      this.stats.failed_logins++;
      
      // Incrementa contador de tentativas falhadas
      const attempt = this.lockedUsers.get(key) || { count: 0, first_attempt: new Date() };
      attempt.count++;
      attempt.last_attempt = new Date();

      if (attempt.count >= this.config.maxFailedLoginAttempts) {
        attempt.locked = true;
        attempt.unlock_at = new Date(Date.now() + this.config.lockoutDuration);
        
        // Gera alerta
        this.createAlert('BRUTE_FORCE_DETECTED', {
          user_id: userId,
          ip,
          attempts: attempt.count
        });
      }

      this.lockedUsers.set(key, attempt);

      this.logAccess({
        user_id: userId,
        action: 'login_failed',
        resource: 'auth',
        ip,
        status: 'failed',
        destination: 'audit_log'
      });
    }
  }

  /**
   * Verifica permissões de recurso
   * 📍 FLUXO: Requisição de Recurso → Verifica ACL → Permite/Nega → Log
   * 
   * @param {string} userId - ID do usuário
   * @param {string} action - Ação desejada (read, create, update, delete)
   * @param {string} resource - Recurso a acessar
   * @param {object} resourceOwner - Dados do proprietário do recurso
   */
  checkResourcePermission(userId, action, resource, resourceOwner = {}) {
    // ACL simplificada (expandir conforme necessário)
    const permissions = {
      'admin': ['read', 'create', 'update', 'delete'],
      'moderator': ['read', 'create', 'update'],
      'user': ['read', 'create']
    };

    // Lógica: 
    // - Admin pode tudo
    // - Usuário pode acessar seus próprios recursos
    // - Usuário pode ler recursos públicos
    const userRole = this.getUserRole(userId);
    const allowed = permissions[userRole] && permissions[userRole].includes(action);

    if (!allowed || (action !== 'read' && resourceOwner.user_id !== userId && userRole !== 'admin')) {
      this.stats.blocked_operations++;
      
      this.logAccess({
        user_id: userId,
        action: `${action}_denied`,
        resource,
        status: 'denied',
        details: { reason: 'INSUFFICIENT_PERMISSIONS' }
      });

      return { allowed: false, reason: 'INSUFFICIENT_PERMISSIONS' };
    }

    this.logAccess({
      user_id: userId,
      action,
      resource,
      status: 'success',
      destination: `${resource}_collection`
    });

    return { allowed: true, reason: 'AUTHORIZED' };
  }

  /**
   * Cria uma sessão de usuário
   * 📍 FLUXO: Login Sucesso → Cria Sessão → Armazena → Registra
   */
  createSession(userId, ip) {
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      user_id: userId,
      ip,
      created_at: new Date(),
      last_activity: new Date(),
      expires_at: new Date(Date.now() + this.config.sessionTimeout),
      active: true
    };

    this.activeSessions.set(sessionId, session);
    return session;
  }

  /**
   * Valida sessão ativa
   * 📍 FLUXO: Verificação de Requisição → Busca Sessão → Valida Validade → Retorna Status
   */
  validateSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return { valid: false, reason: 'SESSION_NOT_FOUND' };
    }

    if (!session.active) {
      return { valid: false, reason: 'SESSION_INACTIVE' };
    }

    if (new Date() > session.expires_at) {
      session.active = false;
      return { valid: false, reason: 'SESSION_EXPIRED' };
    }

    // Atualiza última atividade
    session.last_activity = new Date();
    return { valid: true, session };
  }

  /**
   * Encerra sessão
   * 📍 FLUXO: Logout → Marca Sessão como Inativa → Log
   */
  endSession(sessionId, userId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.active = false;
      session.ended_at = new Date();

      this.logAccess({
        user_id: userId,
        action: 'logout',
        resource: 'auth',
        status: 'success',
        destination: 'session_storage'
      });
    }
  }

  /**
   * Registra fluxo de dados
   * 📍 FLUXO CENTRAL: Dados → Origem → Destino → Registro
   * 
   * @param {object} flow - { source, destination, method, user_id, data_size }
   */
  recordDataFlow(flow) {
    this.stats.data_flows++;
    
    const flowEntry = {
      id: this.generateFlowId(),
      timestamp: new Date(),
      ...flow
    };

    // Log em KeyManager
    KeyManager.logDataFlow(flow.method, flow);

    this.logAccess({
      user_id: flow.user_id || 'system',
      action: `data_flow_${flow.method}`,
      resource: flow.destination,
      status: 'recorded',
      destination: flow.destination,
      details: { source: flow.source, data_size: flow.data_size }
    });

    return flowEntry;
  }

  /**
   * Verifica se usuário está bloqueado
   */
  isUserLocked(userId) {
    for (let [key, attempt] of this.lockedUsers.entries()) {
      if (key.startsWith(userId) && attempt.locked && new Date() < attempt.unlock_at) {
        return true;
      }
    }
    return false;
  }

  /**
   * Retorna papel do usuário (mock - integrar com BD)
   */
  getUserRole(userId) {
    // Mock: admin tem ID 1
    if (userId === 1 || userId === '1') return 'admin';
    // Mock: usuários normais
    return 'user';
  }

  /**
   * Cria alerta de segurança
   * 📍 FLUXO: Evento Suspeito → Analisa → Cria Alerta → Notifica
   */
  createAlert(type, data = {}) {
    const alert = {
      id: this.generateAlertId(),
      type,
      severity: this.getAlertSeverity(type),
      data,
      timestamp: new Date(),
      status: 'active'
    };

    this.alerts.push(alert);

    // Log em KeyManager
    KeyManager.logAudit(`ALERT_${type}`, data);

    console.warn(`⚠️ ALERTA [${alert.severity}]: ${type}`, data);

    return alert;
  }

  /**
   * Define severidade do alerta
   */
  getAlertSeverity(type) {
    const severities = {
      'BRUTE_FORCE_DETECTED': 'high',
      'UNAUTHORIZED_ACCESS': 'high',
      'INVALID_SESSION': 'medium',
      'SUSPICIOUS_ACTIVITY': 'medium',
      'DATA_INTEGRITY_ERROR': 'high',
      'PERMISSION_DENIED': 'low'
    };
    return severities[type] || 'medium';
  }

  /**
   * Verifica comportamentos suspeitos
   * 📍 FLUXO: Evento → Análise Comportamental → Detecção de Anomalias
   */
  checkForAlerts(event) {
    // Múltiplas ações em curto período (possível automação maliciosa)
    const recentEvents = this.events.filter(e => 
      e.user_id === event.user_id && 
      (new Date() - e.timestamp) < 60000 // Últimos 60 segundos
    );

    if (recentEvents.length > 20) {
      this.createAlert('SUSPICIOUS_ACTIVITY', {
        user_id: event.user_id,
        reason: 'high_frequency_operations',
        count: recentEvents.length
      });
    }

    // Tentativa de acesso a recurso não autorizado
    if (event.status === 'denied') {
      const deniedCount = this.events.filter(e =>
        e.user_id === event.user_id &&
        e.status === 'denied' &&
        (new Date() - e.timestamp) < 300000 // Últimos 5 minutos
      ).length;

      if (deniedCount > 5) {
        this.createAlert('UNAUTHORIZED_ACCESS', {
          user_id: event.user_id,
          denied_count: deniedCount
        });
      }
    }
  }

  /**
   * Retorna relatório de acessos
   * 📍 SAÍDA: Para Dashboard de Segurança
   */
  getAccessReport(filters = {}) {
    const { user_id, resource, status, days = 7 } = filters;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let filtered = this.events.filter(e => e.timestamp >= cutoffDate);

    if (user_id) filtered = filtered.filter(e => e.user_id === user_id);
    if (resource) filtered = filtered.filter(e => e.resource === resource);
    if (status) filtered = filtered.filter(e => e.status === status);

    return {
      period_days: days,
      total_events: filtered.length,
      by_status: {
        success: filtered.filter(e => e.status === 'success').length,
        failed: filtered.filter(e => e.status === 'failed').length,
        denied: filtered.filter(e => e.status === 'denied').length
      },
      by_resource: this.groupBy(filtered, 'resource'),
      by_action: this.groupBy(filtered, 'action'),
      top_users: this.getTopUsers(filtered),
      recent_events: filtered.slice(-20)
    };
  }

  /**
   * Retorna relatório de fluxo de dados
   * 📍 SAÍDA: Para Análise de Conformidade
   */
  getDataFlowReport() {
    return KeyManager.getDataFlowReport({ type: 'DATA_FLOW' });
  }

  /**
   * Retorna dashboard com todos os dados
   * 📍 SAÍDA: Painel de Controle Completo
   */
  getDashboard() {
    return {
      timestamp: new Date(),
      statistics: this.stats,
      active_sessions: this.activeSessions.size,
      locked_users: this.lockedUsers.size,
      active_alerts: this.alerts.filter(a => a.status === 'active').length,
      recent_alerts: this.alerts.slice(-10),
      access_summary: this.getAccessReport({ days: 1 }),
      key_manager_status: KeyManager.getStatus(),
      config: this.config
    };
  }

  /**
   * Agrupa dados por campo
   */
  groupBy(arr, field) {
    return arr.reduce((acc, item) => {
      acc[item[field]] = (acc[item[field]] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Retorna usuários mais ativos
   */
  getTopUsers(events, limit = 5) {
    const users = this.groupBy(events, 'user_id');
    return Object.entries(users)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([user_id, count]) => ({ user_id, count }));
  }

  /**
   * Gera IDs únicos
   */
  generateEventId() {
    return 'EVT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateSessionId() {
    return 'SES_' + require('crypto').randomBytes(16).toString('hex');
  }

  generateFlowId() {
    return 'FLO_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateAlertId() {
    return 'ALT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// Exporta instância única
module.exports = new AccessControlDashboard();
