/**
 * DataScraper.js - Sistema de Coleta e Limpeza de Dados
 * 
 * Responsável por:
 * - Coletar dados de múltiplas fontes (BD, APIs, logs)
 * - Normalizar e validar dados
 * - Desduplicar informações
 * - Exportar para análise
 * 
 * 📍 FLUXO: Fontes de Dados → DataScraper → Limpeza → Armazenamento → Dashboard
 * 
 * @author Enterprise Course Platform
 */

const fs = require('fs').promises;
const path = require('path');

class DataScraper {
  constructor() {
    // Armazena dados coletados
    this.scrapedData = {
      users: [],
      blogs: [],
      activities: [],
      metrics: [],
      errors: []
    };

    // Configuração de scraping
    this.config = {
      retryAttempts: 3,
      timeout: 5000,
      batchSize: 100,
      deduplicateDays: 30
    };

    // Estatísticas
    this.stats = {
      started: new Date(),
      last_scrape: null,
      total_records: 0,
      errors: 0
    };
  }

  /**
   * Scrapa dados de usuários (mock - integrar com BD real)
   * 📍 FLUXO: Database → DataScraper.scrapeUsers() → Parse → Storage
   */
  async scrapeUsers(mockUsers = []) {
    try {
      console.log('🔍 Iniciando scraping de usuários...');
      
      const users = mockUsers.length > 0 ? mockUsers : [
        { id: 1, email: 'admin@empresa.com', name: 'Administrador', role: 'admin', created_at: new Date() },
        { id: 2, email: 'user1@empresa.com', name: 'Usuário 1', role: 'user', created_at: new Date() }
      ];

      this.scrapedData.users = users.map(user => ({
        ...user,
        scraped_at: new Date(),
        source: 'users_database',
        hash: this.generateHash(JSON.stringify(user))
      }));

      console.log(`✅ ${this.scrapedData.users.length} usuários coletados`);
      return this.scrapedData.users;
    } catch (error) {
      this.logError('SCRAPE_USERS_ERROR', error);
      throw error;
    }
  }

  /**
   * Scrapa dados de blogs
   * 📍 FLUXO: Database → Blogs Collection → DataScraper → Processamento
   */
  async scrapeBlog(mockBlogs = []) {
    try {
      console.log('🔍 Iniciando scraping de blogs...');
      
      const blogs = mockBlogs.length > 0 ? mockBlogs : [
        { 
          id: 1, 
          title: 'Primeiros Passos', 
          content: 'Conteúdo do blog', 
          author_id: 1, 
          status: 'published',
          created_at: new Date(),
          views: 0,
          likes: 0
        }
      ];

      this.scrapedData.blogs = blogs.map(blog => ({
        ...blog,
        scraped_at: new Date(),
        source: 'blogs_database',
        hash: this.generateHash(JSON.stringify(blog))
      }));

      console.log(`✅ ${this.scrapedData.blogs.length} blogs coletados`);
      return this.scrapedData.blogs;
    } catch (error) {
      this.logError('SCRAPE_BLOGS_ERROR', error);
      throw error;
    }
  }

  /**
   * Scrapa atividades do sistema
   * 📍 FLUXO: Activity Logs → DataScraper → Filtro → Análise
   */
  async scrapeActivities(mockActivities = []) {
    try {
      console.log('🔍 Iniciando scraping de atividades...');
      
      const activities = mockActivities.length > 0 ? mockActivities : [
        { 
          id: 1, 
          user_id: 1, 
          action: 'login', 
          resource: 'auth',
          timestamp: new Date(),
          ip: '192.168.1.1',
          user_agent: 'Mozilla/5.0'
        },
        {
          id: 2,
          user_id: 1,
          action: 'create_blog',
          resource: 'blog',
          timestamp: new Date(),
          ip: '192.168.1.1',
          metadata: { blog_id: 1 }
        }
      ];

      this.scrapedData.activities = activities.map(activity => ({
        ...activity,
        scraped_at: new Date(),
        source: 'activity_logs',
        hash: this.generateHash(JSON.stringify(activity))
      }));

      console.log(`✅ ${this.scrapedData.activities.length} atividades coletadas`);
      return this.scrapedData.activities;
    } catch (error) {
      this.logError('SCRAPE_ACTIVITIES_ERROR', error);
      throw error;
    }
  }

  /**
   * Coleta métricas do sistema
   * 📍 FLUXO: Health Check → Métricas → Storage → Dashboard
   */
  async scrapeMetrics() {
    try {
      console.log('📊 Coletando métricas...');
      
      const metrics = {
        timestamp: new Date(),
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        users_online: this.scrapedData.users.length,
        total_blogs: this.scrapedData.blogs.length,
        total_activities: this.scrapedData.activities.length,
        response_time_avg: Math.random() * 100, // Mock
        error_rate: (this.stats.errors / Math.max(1, this.stats.total_records)) * 100
      };

      this.scrapedData.metrics.push(metrics);
      console.log('✅ Métricas coletadas');
      return metrics;
    } catch (error) {
      this.logError('SCRAPE_METRICS_ERROR', error);
      throw error;
    }
  }

  /**
   * Deduplica registros baseado em hash
   * 📍 FLUXO: Dados Coletados → Deduplicação → Dados Limpos
   */
  deduplicate() {
    const seen = new Set();
    const deduplicated = {};

    Object.keys(this.scrapedData).forEach(category => {
      deduplicated[category] = this.scrapedData[category].filter(item => {
        const itemHash = item.hash;
        if (seen.has(itemHash)) {
          console.log(`⚠️ Duplicata detectada em ${category}`);
          return false;
        }
        seen.add(itemHash);
        return true;
      });
    });

    const removed = Object.keys(this.scrapedData).reduce((sum, key) => {
      return sum + (this.scrapedData[key].length - deduplicated[key].length);
    }, 0);

    this.scrapedData = deduplicated;
    console.log(`🔄 ${removed} registros duplicados removidos`);
    return removed;
  }

  /**
   * Executa limpeza de dados
   * 📍 FLUXO: Dados Brutos → Validação → Normalização → Dados Limpos
   */
  cleanData() {
    const cleaning = {
      removed_invalid: 0,
      normalized: 0,
      removed_old: 0
    };

    // Limpa dados inválidos
    Object.keys(this.scrapedData).forEach(category => {
      if (Array.isArray(this.scrapedData[category])) {
        const before = this.scrapedData[category].length;
        
        // Remove nulls/undefined
        this.scrapedData[category] = this.scrapedData[category].filter(item => item && Object.keys(item).length > 0);
        
        // Remove dados muito antigos (> 30 dias)
        if (category !== 'users') {
          this.scrapedData[category] = this.scrapedData[category].filter(item => {
            const age = new Date() - new Date(item.created_at || item.timestamp || item.scraped_at);
            return age < (this.config.deduplicateDays * 24 * 60 * 60 * 1000);
          });
        }

        cleaning.removed_invalid += before - this.scrapedData[category].length;
        cleaning.normalized++;
      }
    });

    console.log('✨ Limpeza concluída:', cleaning);
    return cleaning;
  }

  /**
   * Exporta dados coletados para arquivo
   * 📍 FLUXO: Dados Processados → Arquivo JSON → Para Análise/Backup
   */
  async exportToFile(filename = 'scraped_data.json') {
    try {
      const filepath = path.join(__dirname, '../../data', filename);
      const data = {
        exported_at: new Date(),
        stats: this.stats,
        data: this.scrapedData
      };

      await fs.writeFile(filepath, JSON.stringify(data, null, 2));
      console.log(`💾 Dados exportados para ${filename}`);
      return filepath;
    } catch (error) {
      this.logError('EXPORT_ERROR', error);
      throw error;
    }
  }

  /**
   * Obtém dados consolidados
   * 📍 SAÍDA: Para Dashboard e Relatórios
   */
  getConsolidatedData(category = null) {
    if (category) {
      return this.scrapedData[category] || [];
    }

    return {
      users: {
        count: this.scrapedData.users.length,
        data: this.scrapedData.users
      },
      blogs: {
        count: this.scrapedData.blogs.length,
        data: this.scrapedData.blogs
      },
      activities: {
        count: this.scrapedData.activities.length,
        recent: this.scrapedData.activities.slice(-20)
      },
      metrics: {
        latest: this.scrapedData.metrics.slice(-1)[0],
        history: this.scrapedData.metrics.slice(-24)
      },
      stats: this.stats
    };
  }

  /**
   * Executa scraping completo
   * 📍 FLUXO COMPLETO: Fontes → Scrape → Limpeza → Dedup → Export
   */
  async runFullScrape(options = {}) {
    console.log('\n🚀 Iniciando Scraping Completo...\n');
    
    const startTime = Date.now();
    
    try {
      // Passo 1: Coleta de dados
      await this.scrapeUsers(options.users);
      await this.scrapeBlog(options.blogs);
      await this.scrapeActivities(options.activities);
      await this.scrapeMetrics();

      // Passo 2: Limpeza
      this.cleanData();

      // Passo 3: Deduplicação
      this.deduplicate();

      // Passo 4: Exportação
      if (options.export !== false) {
        await this.exportToFile(options.filename || 'scraped_data.json');
      }

      // Atualiza estatísticas
      this.stats.last_scrape = new Date();
      this.stats.total_records = Object.keys(this.scrapedData).reduce((sum, key) => {
        return sum + (Array.isArray(this.scrapedData[key]) ? this.scrapedData[key].length : 0);
      }, 0);

      const duration = Date.now() - startTime;
      console.log(`\n✅ Scraping concluído em ${duration}ms\n`);

      return this.getConsolidatedData();
    } catch (error) {
      this.logError('FULL_SCRAPE_ERROR', error);
      throw error;
    }
  }

  /**
   * Registra erros do scraper
   */
  logError(type, error) {
    this.stats.errors++;
    this.scrapedData.errors.push({
      type,
      message: error.message,
      timestamp: new Date(),
      stack: error.stack
    });
    console.error(`❌ Erro [${type}]:`, error.message);
  }

  /**
   * Gera hash para deduplicação
   */
  generateHash(data) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Retorna relatório de scraping
   */
  getReport() {
    return {
      status: 'active',
      stats: this.stats,
      data_summary: {
        users: this.scrapedData.users.length,
        blogs: this.scrapedData.blogs.length,
        activities: this.scrapedData.activities.length,
        metrics_points: this.scrapedData.metrics.length,
        errors: this.scrapedData.errors.length
      },
      config: this.config
    };
  }
}

// Exporta instância única
module.exports = new DataScraper();
