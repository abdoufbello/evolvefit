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

### 2.3 Configurar a Stack (BUILD DO GITHUB)
1. Em **"Build method"**, selecione **"Web editor"**
2. **COPIE E COLE** o conteúdo abaixo na caixa de texto:

```yaml
version: '3.8'

services:
  evolvefit:
    build:
      context: https://github.com/faisalill/EvolveFit.git
      dockerfile: Dockerfile
    container_name: evolvefit-app
    restart: unless-stopped
    volumes:
      - evolvefit_data:/usr/local/apache2/htdocs
    networks:
      - evolvefit
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.evolvefit.rule=Host(`evolvefit.leplustudio.top`)"
      - "traefik.http.routers.evolvefit.entrypoints=websecure"
      - "traefik.http.routers.evolvefit.tls=true"
      - "traefik.http.routers.evolvefit.tls.certresolver=leresolver"
      - "traefik.http.services.evolvefit.loadbalancer.server.port=80"
      - "traefik.http.routers.evolvefit.service=evolvefit"

volumes:
  evolvefit_data:

networks:
  evolvefit:
    external: true
```

**✅ Esta versão constrói a imagem diretamente do repositório GitHub!**

### 2.4 Fazer o Deploy
1. Clique no botão **"Deploy the stack"**
2. Aguarde o build da imagem (pode demorar alguns minutos)
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
3. ✅ Deve aparecer a aplicação EvolveFit completa construída do GitHub

### 3.3 O que esperar
Após o deploy bem-sucedido:
- A imagem será construída diretamente do repositório GitHub
- A aplicação EvolveFit estará totalmente funcional
- Acessível via `https://evolvefit.leplustudio.top`
- SSL configurado automaticamente pelo Traefik
- Volume persistente para dados da aplicação
- Atualizações automáticas quando o repositório for atualizado

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