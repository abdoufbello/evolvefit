# 🚀 GUIA PASSO A PASSO - Deploy EvolveFit no Portainer

## ✅ **PASSO 1: Verificar Pré-requisitos**

### 1.1 Verificar se a network existe
No seu servidor, execute:
```bash
docker network ls | grep evolvefit
```

**Se não aparecer nada**, crie a network:
```bash
docker network create evolvefit
```

### 1.2 Conectar Traefik à network
**Descubra o nome do container do Traefik:**
```bash
docker ps | grep traefik
```

**Conecte o Traefik à network evolvefit:**
```bash
docker network connect evolvefit NOME_DO_CONTAINER_TRAEFIK
```

---

## 🎯 **PASSO 2: Deploy no Portainer (3 OPÇÕES SIMPLES)**

### 2.1 Acessar Portainer
1. Abra seu navegador
2. Acesse: `https://portainer.seudominio.com`
3. Faça login

### 2.2 Criar Nova Stack
1. No menu lateral, clique em **"Stacks"**
2. Clique no botão **"Add stack"**
3. Em **"Name"**, digite: `evolvefit`

### 2.3 Escolher uma das 3 opções abaixo:

---

## 🚀 **OPÇÃO A: Apache (MAIS SIMPLES - RECOMENDADO)**

1. Em **"Build method"**, selecione **"Web editor"**
2. **COPIE E COLE** o conteúdo abaixo:

```yaml
version: '3.8'

services:
  evolvefit:
    image: httpd:alpine
    container_name: evolvefit-app
    restart: unless-stopped
    networks:
      - evolvefit
    labels:
      # Enable Traefik
      - "traefik.enable=true"
      
      # Router configuration
      - "traefik.http.routers.evolvefit.rule=Host(`evolvefit.leplustudio.top`)"
      - "traefik.http.routers.evolvefit.entrypoints=websecure"
      - "traefik.http.routers.evolvefit.tls=true"
      - "traefik.http.routers.evolvefit.tls.certresolver=leresolver"
      
      # Service configuration
      - "traefik.http.services.evolvefit.loadbalancer.server.port=80"
      
      # HTTP to HTTPS redirect
      - "traefik.http.routers.evolvefit-http.rule=Host(`evolvefit.leplustudio.top`)"
      - "traefik.http.routers.evolvefit-http.entrypoints=web"
      - "traefik.http.routers.evolvefit-http.middlewares=redirect-to-https"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.permanent=true"
      
      # Security headers middleware
      - "traefik.http.routers.evolvefit.middlewares=security-headers"
      - "traefik.http.middlewares.security-headers.headers.frameDeny=true"
      - "traefik.http.middlewares.security-headers.headers.contentTypeNosniff=true"
      - "traefik.http.middlewares.security-headers.headers.browserXssFilter=true"
      - "traefik.http.middlewares.security-headers.headers.referrerPolicy=strict-origin-when-cross-origin"
      - "traefik.http.middlewares.security-headers.headers.customRequestHeaders.X-Forwarded-Proto=https"
    
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  evolvefit:
    external: true
```

---

## 🐍 **OPÇÃO B: Python (ALTERNATIVA)**

1. Em **"Build method"**, selecione **"Web editor"**
2. **COPIE E COLE** o conteúdo abaixo:

```yaml
version: '3.8'

services:
  evolvefit:
    image: python:3.11-alpine
    container_name: evolvefit-app
    restart: unless-stopped
    working_dir: /app
    command: python -m http.server 80
    networks:
      - evolvefit
    labels:
      # Enable Traefik
      - "traefik.enable=true"
      
      # Router configuration
      - "traefik.http.routers.evolvefit.rule=Host(`evolvefit.leplustudio.top`)"
      - "traefik.http.routers.evolvefit.entrypoints=websecure"
      - "traefik.http.routers.evolvefit.tls=true"
      - "traefik.http.routers.evolvefit.tls.certresolver=leresolver"
      
      # Service configuration
      - "traefik.http.services.evolvefit.loadbalancer.server.port=80"
      
      # HTTP to HTTPS redirect
      - "traefik.http.routers.evolvefit-http.rule=Host(`evolvefit.leplustudio.top`)"
      - "traefik.http.routers.evolvefit-http.entrypoints=web"
      - "traefik.http.routers.evolvefit-http.middlewares=redirect-to-https"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.permanent=true"
      
      # Security headers middleware
      - "traefik.http.routers.evolvefit.middlewares=security-headers"
      - "traefik.http.middlewares.security-headers.headers.frameDeny=true"
      - "traefik.http.middlewares.security-headers.headers.contentTypeNosniff=true"
      - "traefik.http.middlewares.security-headers.headers.browserXssFilter=true"
      - "traefik.http.middlewares.security-headers.headers.referrerPolicy=strict-origin-when-cross-origin"
      - "traefik.http.middlewares.security-headers.headers.customRequestHeaders.X-Forwarded-Proto=https"
    
    environment:
      - PYTHONUNBUFFERED=1
    
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:80')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  evolvefit:
    external: true
```

---

## 🌐 **OPÇÃO C: Nginx (SE AS OUTRAS NÃO FUNCIONAREM)**

1. Em **"Build method"**, selecione **"Web editor"**
2. **COPIE E COLE** o conteúdo abaixo:

```yaml
version: '3.8'

services:
  evolvefit:
    image: nginx:alpine
    container_name: evolvefit-app
    restart: unless-stopped
    networks:
      - evolvefit
    labels:
      # Enable Traefik
      - "traefik.enable=true"
      
      # Router configuration
      - "traefik.http.routers.evolvefit.rule=Host(`evolvefit.leplustudio.top`)"
      - "traefik.http.routers.evolvefit.entrypoints=websecure"
      - "traefik.http.routers.evolvefit.tls=true"
      - "traefik.http.routers.evolvefit.tls.certresolver=leresolver"
      
      # Service configuration
      - "traefik.http.services.evolvefit.loadbalancer.server.port=80"
      
      # HTTP to HTTPS redirect
      - "traefik.http.routers.evolvefit-http.rule=Host(`evolvefit.leplustudio.top`)"
      - "traefik.http.routers.evolvefit-http.entrypoints=web"
      - "traefik.http.routers.evolvefit-http.middlewares=redirect-to-https"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.permanent=true"
      
      # Security headers middleware
      - "traefik.http.routers.evolvefit.middlewares=security-headers"
      - "traefik.http.middlewares.security-headers.headers.frameDeny=true"
      - "traefik.http.middlewares.security-headers.headers.contentTypeNosniff=true"
      - "traefik.http.middlewares.security-headers.headers.browserXssFilter=true"
      - "traefik.http.middlewares.security-headers.headers.referrerPolicy=strict-origin-when-cross-origin"
      - "traefik.http.middlewares.security-headers.headers.customRequestHeaders.X-Forwarded-Proto=https"
    
    environment:
      - NGINX_HOST=evolvefit.leplustudio.top
      - NGINX_PORT=80
    
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  evolvefit:
    external: true
```

### 2.4 Fazer o Deploy
1. Clique no botão **"Deploy the stack"**
2. Aguarde alguns segundos
3. ✅ **Sucesso!** Se tudo der certo, você verá a stack rodando

---

## 🔍 **PASSO 3: Verificar se Funcionou**

### 3.1 Verificar Container
1. No Portainer, vá em **"Containers"**
2. Procure por **"evolvefit-app"**
3. Status deve estar **"running"** (verde)

### 3.2 Testar o Site
1. Abra seu navegador
2. Acesse: `https://evolvefit.leplustudio.top`
3. ✅ Deve aparecer a página padrão do Nginx

---

## 🚨 **SE DER ERRO**

### Erro de Network
**Mensagem:** `network evolvefit not found`
**Solução:** Execute no servidor:
```bash
docker network create evolvefit
```

### Erro de SSL
**Mensagem:** Site não carrega com HTTPS
**Solução:** Verifique se:
1. DNS está apontando para seu servidor
2. Traefik está rodando
3. Traefik está na network `evolvefit`

### Container não inicia
**Solução:** 
1. Vá em **Containers** no Portainer
2. Clique no container **evolvefit-app**
3. Vá na aba **"Logs"**
4. Me envie os logs para eu ajudar

---

## 📞 **PRECISA DE AJUDA?**

Se algo der errado:
1. **Tire um print** da tela de erro
2. **Copie a mensagem** de erro completa
3. Me envie que eu te ajudo a resolver!

---

## 🎉 **PRÓXIMOS PASSOS (Depois que funcionar)**

1. ✅ Site básico funcionando
2. 🔄 Configurar aplicação EvolveFit completa
3. 🔗 Configurar webhooks n8n
4. 📊 Testar funcionalidades

**Vamos por partes! Primeiro vamos fazer funcionar o básico! 🚀**