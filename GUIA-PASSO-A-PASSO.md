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

## 🎯 **PASSO 2: Deploy no Portainer (MÉTODO RECOMENDADO)**

### 2.1 Acessar Portainer
1. Abra seu navegador
2. Acesse: `https://portainer.seudominio.com`
3. Faça login

### 2.2 Criar Nova Stack
1. No menu lateral, clique em **"Stacks"**
2. Clique no botão **"Add stack"**
3. Em **"Name"**, digite: `evolvefit`

### 2.3 Configurar a Stack (DEPLOY COM GITHUB)
1. Em **"Build method"**, selecione **"Repository"**
2. **Configure os campos:**
   - **Repository URL:** `https://github.com/seu-usuario/EvolveFit`
   - **Repository reference:** `refs/heads/main`
   - **Compose path:** `portainer-stack-git.yml`

### 2.4 Método Alternativo - Web Editor
Se preferir usar o editor web, selecione **"Web editor"** e cole:

```yaml
version: '3.8'

services:
  evolvefit:
    build:
      context: .
      dockerfile: Dockerfile
    image: evolvefit:latest
    container_name: evolvefit-app
    restart: unless-stopped
    networks:
      - evolvefit
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.evolvefit.rule=Host(`evolvefit.leplustudio.top`)"
      - "traefik.http.routers.evolvefit.entrypoints=websecure"
      - "traefik.http.routers.evolvefit.tls=true"
      - "traefik.http.routers.evolvefit.tls.certresolver=leresolver"
      - "traefik.http.services.evolvefit.loadbalancer.server.port=80"
      - "traefik.http.routers.evolvefit-http.rule=Host(`evolvefit.leplustudio.top`)"
      - "traefik.http.routers.evolvefit-http.entrypoints=web"
      - "traefik.http.routers.evolvefit-http.middlewares=redirect-to-https"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
    environment:
      - NGINX_HOST=evolvefit.leplustudio.top
      - NGINX_PORT=80
    healthcheck:
      test: ["CMD", "/usr/local/bin/healthcheck.sh"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  evolvefit:
    external: true
```

**✅ Esta versão constrói a aplicação diretamente do GitHub!**

### 2.5 Fazer o Deploy
1. Clique no botão **"Deploy the stack"**
2. Aguarde alguns minutos (build do GitHub demora mais)
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
3. ✅ Deve aparecer a aplicação EvolveFit construída diretamente do GitHub

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