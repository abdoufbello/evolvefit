# Dockerfile minimalista para máxima compatibilidade com Portainer
FROM node:18-alpine

WORKDIR /app

# Copiar package.json primeiro
COPY package*.json ./

# Instalar dependências sem scripts de build
RUN npm install --production --no-optional --ignore-scripts

# Copiar código da aplicação
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]