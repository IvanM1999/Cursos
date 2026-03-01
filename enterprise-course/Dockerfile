FROM node:18-alpine

# Define diretório de trabalho
WORKDIR /app

# Instala dependências do sistema
RUN apk add --no-cache python3 make g++

# Copia arquivos de dependências
COPY package*.json ./

# Instala dependências npm
RUN npm ci --only=production

# Copia código da aplicação
COPY . .

# Exponhe porta
EXPOSE 3000

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar
CMD ["npm", "start"]
