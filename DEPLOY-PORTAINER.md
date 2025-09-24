# Deploy EvolveFit via Portainer

Guia completo para deploy do EvolveFit usando Portainer com Traefik SSL.

## 📋 Pré-requisitos

- ✅ Portainer instalado e funcionando
- ✅ Traefik configurado com SSL (Let's Encrypt)
- ✅ Network `evolvefit` criada no Docker
- ✅ Domínio `evolvefit.leplustudio.top` apontando para seu servidor
- ✅ n8n configurado com webhooks

## 🚀 Deploy via Portainer

### **Opção 1: Deploy com Git Repository (Recomendado)**

1. Acesse seu Portainer: `https://portainer.seudominio.com`
2. Vá em **Stacks** → **Add Stack**
3. Nome da stack: `evolvefit`
4. **Build method**: Repository
5. **Repository URL**: `https://github.com/SEU-USUARIO/EvolveFit`
6. **Compose path**: `portainer-stack-git.yml`
7. **Deploy the stack**

### **Opção 2: Deploy com Volumes (Alternativa)**

1. Acesse seu Portainer: `https://portainer.seudominio.com`
2. Vá em **Stacks** → **Add Stack**
3. Nome da stack: `evolvefit`
4. **Build method**: Web editor
5. Cole o conteúdo do arquivo `docker-compose.portainer.yml`
6. **Deploy the stack**

### 3. Variáveis de Ambiente (opcional)
Se necessário, adicione as variáveis:
```
TRAEFIK_NETWORK=traefik
TRAEFIK_CERT_RESOLVER=leresolver
APP_DOMAIN=evolvefit.leplustudio.top
```

### 4. Deploy
- Clique em **Deploy the stack**
- Aguarde o build e deploy

## 🔧 Configuração Traefik

### Verificar Network
Certifique-se que a network `evolvefit` existe:
```bash
docker network ls | grep evolvefit
```

Se não existir, crie:
```bash
docker network create evolvefit
```

### Configuração do Traefik
Seu `traefik.yml` deve incluir:
```yaml
entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"

certificatesResolvers:
  leresolver:
    acme:
      email: seu-email@exemplo.com
      storage: /data/acme.json
      httpChallenge:
        entryPoint: web
```

## 🌐 Configuração DNS

Configure seu DNS para apontar para o servidor:
```
evolvefit.leplustudio.top    A    SEU-IP-SERVIDOR
```

## 📊 Monitoramento

### Verificar Status
- **Portainer**: Stacks → evolvefit → Status
- **Logs**: Containers → evolvefit-app → Logs
- **Health**: Container deve mostrar "healthy"

### Testar Aplicação
1. Acesse: `https://evolvefit.leplustudio.top`
2. Verifique SSL (cadeado verde)
3. Teste funcionalidades básicas

## 🔄 Atualizações

### Via Portainer (Automático)
Se configurou automatic updates:
- Portainer verificará mudanças no repositório
- Fará redeploy automaticamente

### Via Portainer (Manual)
1. Stacks → evolvefit
2. **Update the stack**
3. **Pull and redeploy**

### Via Git + Webhook (Avançado)
Configure webhook no GitHub para trigger automático:
```bash
curl -X POST "https://portainer.leplustudio.top/api/stacks/webhook/WEBHOOK-ID"
```

## 🛠️ Troubleshooting

### Container não inicia
```bash
# Verificar logs
docker logs evolvefit-app

# Verificar network
docker network inspect traefik
```

### SSL não funciona
1. Verificar DNS apontando corretamente
2. Verificar Traefik logs: `docker logs traefik`
3. Verificar arquivo acme.json: `ls -la /data/acme.json`

### Domínio não resolve
1. Verificar configuração DNS
2. Verificar labels do Traefik
3. Testar: `nslookup evolvefit.leplustudio.top`

### n8n webhooks não funcionam
1. Verificar URLs no `config.js`
2. Testar webhooks manualmente
3. Verificar logs do n8n

## 📱 Pós-Deploy

### Configurar n8n Workflows
1. **LLM Webhook**: `https://n8n.leplustudio.top/webhook/evolvefit-llm`
2. **Notion Webhook**: `https://n8n.leplustudio.top/webhook/evolvefit-notion`
3. **Analysis Webhook**: `https://n8n.leplustudio.top/webhook/evolvefit-analysis`

### Testar Funcionalidades
- ✅ Cadastro de aluno
- ✅ Geração de plano de treino
- ✅ Sincronização com Notion
- ✅ Gráficos de progresso
- ✅ Responsividade mobile

## 🔒 Segurança

### Headers Implementados
- ✅ HTTPS obrigatório
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Referrer-Policy: strict-origin-when-cross-origin

### Backup
- Configure backup regular do Portainer
- Backup dos dados do n8n
- Backup do banco Notion (automático)

---

🎉 **Deploy Concluído!** Acesse: https://evolvefit.leplustudio.top