#!/bin/bash
# start-dev-linux.sh - Inicializador para Linux/Mac
# Equivalente ao start-dev.bat para sistemas Unix-like

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "======================================================"
echo "  ENTERPRISE COURSE PLATFORM v1.0"
echo "  Servidor de Desenvolvimento - Modo Robusto"
echo "  Auto-Restart | File Watch | Error Recovery"
echo "======================================================"
echo ""

# Verifica Node.js
echo -e "${YELLOW}[INFO]${NC} Verificando requisitos..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERRO]${NC} Node.js não está instalado."
    echo "       Baixe em: https://nodejs.org (v18+)"
    exit 1
fi

echo -e "${GREEN}[OK]${NC} Node.js detectado:"
node --version
echo ""

if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERRO]${NC} npm não está instalado."
    exit 1
fi

echo -e "${GREEN}[OK]${NC} npm detectado:"
npm --version
echo ""

# Instala dependências se necessário
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[INFO]${NC} Instalando dependências npm..."
    npm install --legacy-peer-deps
    echo -e "${GREEN}[OK]${NC} Dependências instaladas."
    echo ""
fi

# Cria .env se não existir
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}[INFO]${NC} Criando arquivo .env..."
    cp .env.example .env
    echo -e "${GREEN}[OK]${NC} .env criado."
    echo "       Revise as variáveis de ambiente se necessário."
    echo ""
fi

# Limpa processos antigos
echo -e "${YELLOW}[INFO]${NC} Limpando processos anteriores..."
pkill -f "node backend/src/server.js" 2>/dev/null || true
pkill -f "ServerBootstrap" 2>/dev/null || true
echo -e "${GREEN}[OK]${NC} Processos antigos encerrados."
echo ""

# Inicia o servidor
echo -e "${YELLOW}[INFO]${NC} Iniciando servidor com suporte a:"
echo "       + Auto-restart ao salvar arquivos"
echo "       + Recuperação automática de erros"
echo "       + Monitoramento em tempo real"
echo "       + Watch de mudanças (15+ arquivos)"
echo ""

echo -e "${YELLOW}[INFO]${NC} Aguarde... Servidor iniciando..."
echo ""

node backend/src/utils/ServerBootstrap.js

echo ""
echo -e "${YELLOW}[AVISO]${NC} Servidor foi encerrado."
