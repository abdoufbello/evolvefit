# EvolveFit - Personal Trainer Dashboard

Um sistema completo de gerenciamento de alunos para personal trainers, desenvolvido como Single Page Application (SPA) com integração LLM e sincronização com Notion.

## 🚀 Funcionalidades

- **Gestão de Alunos**: CRUD completo com anamnese e benchmarks de performance
- **Planos de Treino Inteligentes**: Geração automática com ciclos de 28 dias (3 ON, 1 Active Rest, 2 ON, 1 OFF)
- **Integração LLM**: Geração de treinos personalizados via webhook n8n
- **Sincronização Notion**: Backup automático de dados via n8n
- **Análise de Progresso**: Visualizações com Chart.js e insights via LLM
- **Interface Moderna**: Dark theme responsivo com Tailwind CSS

## 🛠️ Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Styling**: Tailwind CSS (CDN)
- **Charts**: Chart.js (CDN)
- **Fonts**: Google Fonts (Inter, Poppins)
- **Storage**: localStorage
- **Backend**: n8n webhooks para LLM e Notion
- **Deploy**: Docker + Nginx + Traefik SSL

## 📦 Deploy com Docker

### Pré-requisitos
- Docker e Docker Compose instalados
- Traefik configurado com SSL (Let's Encrypt)
- n8n configurado com webhooks

### Configuração

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/evolvefit.git
cd evolvefit
```

2. Configure as variáveis de ambiente no `config.js`:
```javascript
const CONFIG = {
    webhooks: {
        llm: 'https://seu-n8n.com/webhook/llm',
        notion: 'https://seu-n8n.com/webhook/notion'
    }
};
```

3. Execute o deploy:
```bash
docker-compose up -d
```

### Configuração do Traefik

O `docker-compose.yml` já inclui as labels necessárias para o Traefik:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.evolvefit.rule=Host(`evolvefit.leplustudio.top`)"
  - "traefik.http.routers.evolvefit.entrypoints=web,websecure"
  - "traefik.http.routers.evolvefit.tls=true"
  - "traefik.http.routers.evolvefit.tls.certresolver=leresolver"
  - "traefik.http.services.evolvefit.loadbalancer.server.port=80"
```

## 🔧 Configuração n8n

### Webhook LLM
Configure um workflow no n8n que:
1. Receba dados do aluno via webhook
2. Processe com seu LLM preferido (OpenAI, Claude, etc.)
3. Retorne plano de treino estruturado

### Webhook Notion
Configure um workflow no n8n que:
1. Receba dados do aluno via webhook
2. Sincronize com database do Notion
3. Mantenha backup dos dados

## 🎨 Interface

### Cores do Tema
- **Background Primary**: #1A202C
- **Background Secondary**: #2D3748
- **Accent Primary**: #00F5A0
- **Text Primary**: #F7FAFC
- **Text Secondary**: #A0AEC0

### Fontes
- **Interface**: Inter (Google Fonts)
- **Títulos**: Poppins (Google Fonts)

## 📱 Telas

1. **Lista de Alunos**: Visualização e gerenciamento de todos os alunos
2. **Formulário de Aluno**: Cadastro/edição com anamnese completa
3. **Plano de Treino**: Visualização e execução do treino do dia
4. **Progresso**: Gráficos de evolução por exercício

## 🔒 Segurança

- Headers de segurança configurados no Nginx
- Content Security Policy implementada
- Dados sensíveis não expostos no frontend
- Comunicação HTTPS obrigatória

## 📊 Estrutura de Dados

### Aluno
```javascript
{
  id: string,
  name: string,
  goal: string,
  age: number,
  weight: number,
  height: number,
  injuries: string,
  benchmark: {
    squat: number,
    bench: number,
    legpress: number,
    deadlift: number,
    pullups: number,
    pushups: number
  },
  training: {
    location: string,
    modality: string
  },
  workoutPlan: Array,
  progress: Array
}
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Para suporte, abra uma issue no GitHub ou entre em contato via email.

---

**EvolveFit** - Evolua seu negócio de personal trainer! 💪