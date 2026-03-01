/**
 * adminRoutes.js - Rotas para Painel Administrativo
 * 
 * Endpoints para:
 * - Dashboard de controle de acessos
 * - Gestão de chaves
 * - Data scraping
 * - Relatórios e auditoria
 * - Monitoramento do sistema
 * 
 * 📍 FLUXO: Admin Request → authMiddleware → isAdmin Check → Controller → Response
 * 
 * @author Enterprise Course Platform
 */

const express = require('express');
const router = express.Router();

// Importa os controllers/utilities
const authMiddleware = require('../middleware/authMiddleware');
const KeyManager = require('../utils/KeyManager');
const DataScraper = require('../utils/DataScraper');
const AccessControlDashboard = require('../utils/AccessControlDashboard');

/**
 * Middleware de verificação de admin
 * 📍 Valida se o usuário tem permissão de administrador
 */
const requireAdmin = (req, res, next) => {
  const hasSession = Boolean(req.session.userId);
  const isAdminRole = req.session.role === 'admin';
  const isDefaultAdmin = String(req.session.userId) === '1';
  if (!hasSession || (!isAdminRole && !isDefaultAdmin)) {
    return res.status(403).json({ 
      error: 'Acesso negado. Privilégios de admin necessários.' 
    });
  }
  next();
};

/**
 * GET /api/admin/dashboard
 * 📍 FLUXO: Admin → Dashboard Request → Coleta Dados → AccessControlDashboard → JSON Response
 * 
 * Retorna:
 * - Estatísticas de acessos
 * - Sessões ativas
 * - Alertas de segurança
 * - Status do KeyManager
 * - Data flows registrados
 */
router.get('/dashboard', authMiddleware, requireAdmin, (req, res) => {
  try {
    // Registra acesso ao dashboard no AccessControl
    AccessControlDashboard.logAccess({
      user_id: req.session.userId,
      action: 'access_admin_dashboard',
      resource: 'admin_dashboard',
      ip: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Coleta dados consolidados do dashboard
    const dashboard = AccessControlDashboard.getDashboard();

    res.json({
      status: 'success',
      data: dashboard,
      message: 'Dashboard carregado com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao carregar dashboard:', error);
    res.status(500).json({ 
      error: 'Erro ao carregar dashboard',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/keys
 * 📍 FLUXO: Admin → Keys Request → KeyManager.listKeys() → Metadados (sem valores) → Response
 * 
 * Retorna lista de chaves registradas com metadados
 * (valores sensíveis são ocultados por segurança)
 */
router.get('/keys', authMiddleware, requireAdmin, (req, res) => {
  try {
    AccessControlDashboard.logAccess({
      user_id: req.session.userId,
      action: 'access_keys_list',
      resource: 'key_manager',
      ip: req.ip
    });

    const keys = KeyManager.listKeys();

    res.json({
      status: 'success',
      count: keys.length,
      data: keys,
      message: 'Lista de chaves carregada'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/keys/rotate
 * 📍 FLUXO: Admin → Rotate Request → Valida → KeyManager.rotate() → Log Auditoria → Response
 * 
 * Renova uma chave do sistema (rotação de segurança)
 * Corpo esperado: { key_name: string, new_value: string }
 */
router.post('/keys/rotate', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { key_name, new_value } = req.body;

    if (!key_name || !new_value) {
      return res.status(400).json({ 
        error: 'key_name e new_value são obrigatórios' 
      });
    }

    KeyManager.rotate(key_name, new_value);

    AccessControlDashboard.logAccess({
      user_id: req.session.userId,
      action: 'rotate_key',
      resource: 'key_manager',
      ip: req.ip,
      details: { key_name }
    });

    res.json({
      status: 'success',
      message: `Chave ${key_name} renovada com sucesso`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/data-scraper/report
 * 📍 FLUXO: Admin → Scraper Report → DataScraper.getReport() → JSON Response
 * 
 * Retorna status e estatísticas do DataScraper
 */
router.get('/data-scraper/report', authMiddleware, requireAdmin, (req, res) => {
  try {
    AccessControlDashboard.logAccess({
      user_id: req.session.userId,
      action: 'view_scraper_report',
      resource: 'data_scraper',
      ip: req.ip
    });

    const report = DataScraper.getReport();

    res.json({
      status: 'success',
      data: report
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/data-scraper/run
 * 📍 FLUXO: Admin → Run Scraper → DataScraper.runFullScrape() → Coleta Dados → Export → Response
 * 
 * Executa um ciclo completo de scraping de dados
 * Etapas:
 * 1. Coleta dados de todas as fontes
 * 2. Limpeza de dados inválidos
 * 3. Deduplicação
 * 4. Exportação para arquivo
 */
router.post('/data-scraper/run', authMiddleware, requireAdmin, async (req, res) => {
  try {
    AccessControlDashboard.logAccess({
      user_id: req.session.userId,
      action: 'run_data_scraper',
      resource: 'data_scraper',
      ip: req.ip
    });

    // Executa o scraper (pode demorar)
    const startTime = Date.now();
    const scrapedData = await DataScraper.runFullScrape({
      export: true,
      filename: `scraped_data_${Date.now()}.json`
    });
    const duration = Date.now() - startTime;

    res.json({
      status: 'success',
      duration_ms: duration,
      data: scrapedData,
      message: 'Scraping concluído com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro no data scraper:', error);
    res.status(500).json({ 
      error: 'Erro ao executar scraper',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/scraper/data/:category
 * 📍 FLUXO: Admin → Get Category Data → DataScraper.getConsolidatedData(category) → Response
 * 
 * @param category - users, blogs, activities, metrics
 */
router.get('/scraper/data/:category', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { category } = req.params;
    const data = DataScraper.getConsolidatedData(category);

    AccessControlDashboard.logAccess({
      user_id: req.session.userId,
      action: 'view_scraped_data',
      resource: `scraper_${category}`,
      ip: req.ip
    });

    res.json({
      status: 'success',
      category,
      count: Array.isArray(data) ? data.length : 0,
      data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/access-logs
 * 📍 FLUXO: Admin → Access Logs → AccessControlDashboard.getAccessReport() → Filtered Response
 * 
 * Query parameters:
 * - ?days=7 (padrão)
 * - ?user_id=123
 * - ?resource=blog
 * - ?status=success|failed|denied
 */
router.get('/access-logs', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { days, user_id, resource, status } = req.query;

    const filters = {
      days: parseInt(days) || 7,
      user_id,
      resource,
      status
    };

    const report = AccessControlDashboard.getAccessReport(filters);

    AccessControlDashboard.logAccess({
      user_id: req.session.userId,
      action: 'view_access_logs',
      resource: 'audit_logs',
      ip: req.ip,
      details: { filters }
    });

    res.json({
      status: 'success',
      filters,
      data: report
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/data-flows
 * 📍 FLUXO: Admin → Data Flow Report → KeyManager.getDataFlowReport() → Response
 * 
 * Retorna registro de todos os fluxos de dados do sistema
 * Mostra: origem → destino → método → timestamp → usuário
 */
router.get('/data-flows', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;

    const report = KeyManager.getDataFlowReport({
      type,
      startDate,
      endDate
    });

    AccessControlDashboard.logAccess({
      user_id: req.session.userId,
      action: 'view_data_flows',
      resource: 'data_flow_logs',
      ip: req.ip
    });

    res.json({
      status: 'success',
      data: report
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/alerts
 * 📍 FLUXO: Admin → Alerts List → AccessControlDashboard.alerts → Response
 * 
 * Retorna alertas de segurança ativos e recentes
 */
router.get('/alerts', authMiddleware, requireAdmin, (req, res) => {
  try {
    const alerts = AccessControlDashboard.alerts;

    AccessControlDashboard.logAccess({
      user_id: req.session.userId,
      action: 'view_alerts',
      resource: 'security_alerts',
      ip: req.ip
    });

    res.json({
      status: 'success',
      active_alerts: alerts.filter(a => a.status === 'active').length,
      total_alerts: alerts.length,
      data: alerts.slice(-50) // Últimos 50 alertas
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/statistics
 * 📍 FLUXO: Admin → Statistics → Coleta Múltiplas Fontes → Consolidação → Response
 * 
 * Retorna estatísticas consolidadas:
 * - Total de operações
 * - Falhas de login
 * - Operações bloqueadas
 * - Fluxos de dados
 * - Usuários únicos
 */
router.get('/statistics', authMiddleware, requireAdmin, (req, res) => {
  try {
    const stats = AccessControlDashboard.stats;
    const consolidatedData = DataScraper.getConsolidatedData();

    AccessControlDashboard.logAccess({
      user_id: req.session.userId,
      action: 'view_statistics',
      resource: 'system_stats',
      ip: req.ip
    });

    res.json({
      status: 'success',
      statistics: {
        access_control: stats,
        data_scraper: consolidatedData.stats,
        system_summary: {
          total_users: consolidatedData.users.count,
          total_blogs: consolidatedData.blogs.count,
          total_activities: consolidatedData.activities.count,
          active_sessions: AccessControlDashboard.activeSessions.size
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/system-health
 * 📍 FLUXO: Health Check → Coleta Métricas → Avaliação → Response
 * 
 * Retorna status de saúde do sistema
 */
router.get('/system-health', authMiddleware, requireAdmin, (req, res) => {
  try {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    const alerts = AccessControlDashboard.alerts.filter(a => a.status === 'active');

    AccessControlDashboard.logAccess({
      user_id: req.session.userId,
      action: 'check_system_health',
      resource: 'system_health',
      ip: req.ip
    });

    res.json({
      status: 'success',
      health: {
        uptime_seconds: Math.round(uptime),
        memory: {
          rss: Math.round(memory.rss / 1024 / 1024), // MB
          heap_used: Math.round(memory.heapUsed / 1024 / 1024),
          heap_total: Math.round(memory.heapTotal / 1024 / 1024)
        },
        active_sessions: AccessControlDashboard.activeSessions.size,
        locked_users: AccessControlDashboard.lockedUsers.size,
        active_alerts: alerts.length,
        overall_status: alerts.some(a => a.severity === 'high') ? 'warning' : 'healthy'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

