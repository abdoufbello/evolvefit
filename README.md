# 🏋️‍♂️ EvolveFit - Plataforma Inteligente de Fitness

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-brightgreen.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-%3E%3D%2014.0-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

## 📋 Sobre o Projeto

**EvolveFit** é uma plataforma inteligente de fitness que combina tecnologia de ponta com personalização avançada para criar experiências únicas de treino e nutrição. Utilizando IA, vector search e análise de dados, a plataforma oferece recomendações personalizadas e acompanhamento detalhado do progresso.

### 🌟 Principais Funcionalidades

- **🤖 IA Integrada**: Geração automática de treinos e análises nutricionais
- **🔍 Vector Search**: Busca inteligente de exercícios por similaridade
- **📊 Analytics Avançado**: Acompanhamento detalhado de progresso
- **🍎 Nutrição Inteligente**: Recomendações personalizadas de alimentação
- **⚡ Performance Otimizada**: Sistema de cache e indexação avançada
- **🔒 Segurança Robusta**: Autenticação JWT e rate limiting inteligente
- **📱 Interface Moderna**: Design responsivo e intuitivo

## 🏗️ Arquitetura

### Backend (Node.js + Express)
- **API RESTful** com autenticação JWT
- **PostgreSQL** com extensão pgvector para vector search
- **Sistema de Cache LLM** para otimização de performance
- **Rate Limiting Avançado** com suporte a Redis
- **Integração n8n** para workflows de IA

### Frontend (HTML5 + JavaScript)
- **Interface Responsiva** com Chart.js para visualizações
- **PWA Ready** para instalação mobile
- **Real-time Updates** via WebSocket (planejado)

### Integrações
- **OpenAI API** para geração de embeddings e análises
- **n8n Webhooks** para processamento de IA
- **Notion API** para sincronização de dados (opcional)

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js >= 18.0.0
- PostgreSQL >= 14.0
- Redis (opcional, para rate limiting)
- Docker (opcional)

### 1. Clone o Repositório

```bash
git clone https://github.com/seu-usuario/evolvefit.git
cd evolvefit
```

### 2. Configuração do Backend

```bash
cd backend
npm install
```

### 3. Configuração do Banco de Dados

```bash
# Criar banco PostgreSQL
createdb evolvefit

# Executar migrações
psql -d evolvefit -f migrations/001_initial_schema.sql
psql -d evolvefit -f migrations/002_performance_optimization.sql
```

### 4. Variáveis de Ambiente

Crie um arquivo `.env` no diretório `backend/`:

```env
# Banco de Dados
DATABASE_URL=postgresql://usuario:senha@localhost:5432/evolvefit
DB_HOST=localhost
DB_PORT=5432
DB_NAME=evolvefit
DB_USER=seu_usuario
DB_PASSWORD=sua_senha

# JWT
JWT_SECRET=seu_jwt_secret_super_seguro
JWT_REFRESH_SECRET=seu_refresh_secret_super_seguro

# OpenAI (opcional)
OPENAI_API_KEY=sua_chave_openai

# n8n Webhooks
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/evolvefit-llm

# Redis (opcional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=sua_senha_redis

# Servidor
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:8080

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_BYPASS_KEY=seu_bypass_key
```

### 5. Iniciar a Aplicação

```bash
# Backend
cd backend
npm start

# Frontend (em outro terminal)
cd ..
python -m http.server 8080
```

## 🐳 Docker

### Usando Docker Compose

```bash
docker-compose up -d
```

### Build Manual

```bash
# Backend
cd backend
docker build -t evolvefit-backend .

# Executar
docker run -p 3000:3000 --env-file .env evolvefit-backend
```

## 📚 Documentação da API

### Autenticação

```bash
# Registro
POST /api/auth/register
{
  "email": "usuario@exemplo.com",
  "name": "Nome Usuario",
  "password": "senha123"
}

# Login
POST /api/auth/login
{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

### Workouts

```bash
# Listar treinos
GET /api/workouts

# Busca por similaridade
GET /api/workouts/search?query=treino+peito&limit=5

# Recomendações personalizadas
GET /api/workouts/recommendations?limit=10

# Gerar treino com IA
POST /api/workouts/generate
{
  "goal": "muscle_gain",
  "experience": "intermediate",
  "duration": 60
}
```

### Progresso

```bash
# Registrar progresso
POST /api/progress
{
  "weight": 75.5,
  "body_fat": 15.2,
  "measurements": {
    "chest": 100,
    "waist": 80
  }
}

# Análise de progresso com IA
POST /api/progress/analyze
{
  "period": "30_days",
  "goals": ["muscle_gain", "fat_loss"]
}
```

### Nutrição

```bash
# Recomendações nutricionais
GET /api/nutrition/recommendations?goal=muscle_gain&activity_level=high

# Análise nutricional
POST /api/nutrition/analyze
{
  "meals": [
    {
      "name": "Frango grelhado",
      "quantity": "200g"
    }
  ]
}
```

## 🔧 Administração

### Endpoints Admin

```bash
# Estatísticas do sistema
GET /api/admin/stats

# Gerenciar rate limiting
GET /api/admin/rate-limit/stats/:userId
POST /api/admin/rate-limit/reset/:userId

# Manutenção
POST /api/admin/maintenance/refresh-views
POST /api/admin/maintenance/cleanup

# Performance
GET /api/admin/performance/queries
GET /api/admin/database/indexes
```

### Script de Deploy

```bash
# Deploy completo
node scripts/deploy.js deploy

# Verificar saúde
node scripts/deploy.js health

# Rollback
node scripts/deploy.js rollback
```

## 🧪 Testes

```bash
# Executar testes
npm test

# Testes com cobertura
npm run test:coverage

# Testes de integração
npm run test:integration
```

## 📊 Monitoramento

### Health Checks

- **Backend**: `http://localhost:3000/health`
- **Cache Stats**: `http://localhost:3000/api/cache/stats`
- **Admin Panel**: `http://localhost:3000/api/admin/stats`

### Métricas Disponíveis

- Performance de queries
- Estatísticas de rate limiting
- Uso de cache LLM
- Estatísticas de usuários
- Análise de índices de banco

## 🔒 Segurança

- **Autenticação JWT** com refresh tokens
- **Rate limiting inteligente** por endpoint
- **Validação de entrada** em todas as rotas
- **Sanitização de dados** para prevenir XSS
- **Headers de segurança** com Helmet.js
- **CORS configurado** adequadamente

## 🚀 Deploy em Produção

### Heroku

```bash
# Criar app
heroku create evolvefit-app

# Configurar variáveis
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=sua_database_url

# Deploy
git push heroku main
```

### Vercel (Frontend)

```bash
# Instalar CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Railway

```bash
# Conectar repositório no Railway Dashboard
# Configurar variáveis de ambiente
# Deploy automático via Git
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código

- **ESLint** para JavaScript
- **Prettier** para formatação
- **Conventional Commits** para mensagens
- **Testes obrigatórios** para novas features

## 📝 Roadmap

### Versão 2.0
- [ ] App mobile React Native
- [ ] WebSocket para updates em tempo real
- [ ] Sistema de gamificação
- [ ] Integração com wearables
- [ ] Machine Learning avançado

### Versão 2.1
- [ ] Comunidade e social features
- [ ] Marketplace de treinos
- [ ] Coaching virtual avançado
- [ ] Análise de vídeo de exercícios

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👥 Equipe

- **Desenvolvedor Principal**: [Seu Nome](https://github.com/seu-usuario)
- **Contribuidores**: Veja [CONTRIBUTORS.md](CONTRIBUTORS.md)

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/seu-usuario/evolvefit/issues)
- **Discussões**: [GitHub Discussions](https://github.com/seu-usuario/evolvefit/discussions)
- **Email**: suporte@evolvefit.com

## 🙏 Agradecimentos

- OpenAI pela API de IA
- PostgreSQL e pgvector pela tecnologia de vector search
- n8n pela plataforma de automação
- Comunidade open source

---

**Feito com ❤️ para revolucionar o fitness através da tecnologia**