/**
 * NÚCLEO - Core da Aplicação Enterprise
 * Gerencia conexões, inicialização e componentes fundamentais
 */

const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');

class EnterpriseCore {
  constructor() {
    this.mongoConnection = null;
    this.pgConnection = null;
    this.modules = {};
  }

  /**
   * Inicializa conexão MongoDB
   */
  async connectMongoDB() {
    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/enterprise_course';
      
      this.mongoConnection = await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      
      console.log('✅ MongoDB conectado com sucesso');
      return this.mongoConnection;
    } catch (error) {
      console.error('❌ Erro ao conectar MongoDB:', error.message);
      throw error;
    }
  }

  /**
   * Inicializa conexão PostgreSQL
   */
  async connectPostgreSQL() {
    try {
      this.pgConnection = new Sequelize(
        process.env.DB_NAME || 'enterprise_course',
        process.env.DB_USER || 'postgres',
        process.env.DB_PASSWORD || 'password',
        {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          dialect: 'postgres',
          logging: process.env.NODE_ENV === 'development' ? console.log : false
        }
      );

      await this.pgConnection.authenticate();
      console.log('✅ PostgreSQL conectado com sucesso');
      return this.pgConnection;
    } catch (error) {
      console.error('❌ Erro ao conectar PostgreSQL:', error.message);
      throw error;
    }
  }

  /**
   * Registra um módulo
   */
  registerModule(name, module) {
    this.modules[name] = module;
    console.log(`📦 Módulo "${name}" registrado`);
  }

  /**
   * Obtém um módulo registrado
   */
  getModule(name) {
    return this.modules[name];
  }

  /**
   * Retorna status da aplicação
   */
  getStatus() {
    return {
      mongodb: this.mongoConnection ? 'conectado' : 'desconectado',
      postgresql: this.pgConnection ? 'conectado' : 'desconectado',
      modules: Object.keys(this.modules)
    };
  }
}

const core = new EnterpriseCore();

module.exports = core;
