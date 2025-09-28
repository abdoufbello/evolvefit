# Dockerfile otimizado para Portainer
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema necessárias
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client \
    wget

# Configurar Python para node-gyp
ENV PYTHON=/usr/bin/python3

# Copiar arquivos de dependências primeiro (para cache)
COPY package*.json ./

# Instalar dependências com configurações otimizadas
RUN npm config set python /usr/bin/python3 && \
    npm install --only=production && \
    npm cache clean --force

# Copiar código da aplicação
COPY . .

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Mudar para usuário não-root
USER nodejs

# Expor porta da aplicação
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Comando de inicialização
CMD ["npm", "start"]