# 🤝 Guia de Contribuição - EvolveFit

Obrigado por considerar contribuir para o EvolveFit! Este documento fornece diretrizes para contribuir com o projeto.

## 📋 Código de Conduta

Ao participar deste projeto, você concorda em manter um ambiente respeitoso e inclusivo para todos os contribuidores.

## 🚀 Como Contribuir

### 1. Reportar Bugs

Antes de reportar um bug:
- Verifique se já não existe uma issue similar
- Use a versão mais recente do projeto
- Forneça informações detalhadas sobre o problema

**Template para Bug Report:**
```markdown
**Descrição do Bug**
Uma descrição clara e concisa do bug.

**Passos para Reproduzir**
1. Vá para '...'
2. Clique em '....'
3. Role para baixo até '....'
4. Veja o erro

**Comportamento Esperado**
Uma descrição clara do que você esperava que acontecesse.

**Screenshots**
Se aplicável, adicione screenshots para ajudar a explicar o problema.

**Ambiente:**
- OS: [ex: Windows 10]
- Browser: [ex: Chrome 91]
- Versão do Node.js: [ex: 18.0.0]
```

### 2. Sugerir Melhorias

Para sugerir uma nova funcionalidade:
- Abra uma issue com o label "enhancement"
- Descreva detalhadamente a funcionalidade
- Explique por que seria útil para o projeto

### 3. Contribuir com Código

#### Fork e Clone

```bash
# Fork o repositório no GitHub
# Clone seu fork
git clone https://github.com/seu-usuario/evolvefit.git
cd evolvefit

# Adicione o repositório original como upstream
git remote add upstream https://github.com/original-usuario/evolvefit.git
```

#### Configuração do Ambiente

```bash
# Instalar dependências
cd backend
npm install

# Configurar banco de dados
createdb evolvefit_dev
psql -d evolvefit_dev -f migrations/001_initial_schema.sql
psql -d evolvefit_dev -f migrations/002_performance_optimization.sql

# Copiar arquivo de ambiente
cp .env.example .env
# Editar .env com suas configurações
```

#### Workflow de Desenvolvimento

1. **Criar Branch**
```bash
git checkout -b feature/nome-da-funcionalidade
# ou
git checkout -b fix/nome-do-bug
```

2. **Fazer Alterações**
- Siga os padrões de código estabelecidos
- Adicione testes para novas funcionalidades
- Mantenha commits pequenos e focados

3. **Testar**
```bash
# Executar testes
npm test

# Verificar linting
npm run lint

# Verificar formatação
npm run format:check
```

4. **Commit**
```bash
# Use Conventional Commits
git commit -m "feat: adicionar busca por similaridade de exercícios"
git commit -m "fix: corrigir erro de autenticação JWT"
git commit -m "docs: atualizar documentação da API"
```

5. **Push e Pull Request**
```bash
git push origin feature/nome-da-funcionalidade
```

Abra um Pull Request no GitHub com:
- Título descritivo
- Descrição detalhada das mudanças
- Referência a issues relacionadas
- Screenshots se aplicável

## 📝 Padrões de Código

### JavaScript/Node.js

- Use **ESLint** e **Prettier** configurados no projeto
- Siga o padrão **ES6+**
- Use **async/await** em vez de callbacks
- Documente funções complexas com JSDoc

```javascript
/**
 * Busca exercícios por similaridade usando vector search
 * @param {string} query - Termo de busca
 * @param {number} limit - Número máximo de resultados
 * @param {string} userId - ID do usuário para personalização
 * @returns {Promise<Array>} Lista de exercícios similares
 */
async function searchSimilarExercises(query, limit = 10, userId = null) {
  // implementação
}
```

### SQL

- Use **snake_case** para nomes de tabelas e colunas
- Sempre use **prepared statements**
- Adicione comentários para queries complexas
- Mantenha migrations versionadas

### Frontend

- Use **camelCase** para JavaScript
- Mantenha componentes pequenos e reutilizáveis
- Adicione comentários para lógica complexa
- Use **semantic HTML**

## 🧪 Testes

### Tipos de Testes

1. **Testes Unitários**
```javascript
// tests/unit/services/vectorSearch.test.js
describe('VectorSearch Service', () => {
  test('should generate embeddings for workout query', async () => {
    const result = await vectorSearch.generateEmbedding('chest workout');
    expect(result).toHaveLength(1536);
  });
});
```

2. **Testes de Integração**
```javascript
// tests/integration/api/workouts.test.js
describe('Workouts API', () => {
  test('GET /api/workouts should return paginated results', async () => {
    const response = await request(app)
      .get('/api/workouts?page=1&limit=10')
      .expect(200);
    
    expect(response.body.data).toHaveLength(10);
  });
});
```

3. **Testes E2E** (planejado)
```javascript
// tests/e2e/user-journey.test.js
describe('User Journey', () => {
  test('user can register, login and create workout', async () => {
    // implementação com Playwright ou Cypress
  });
});
```

### Executar Testes

```bash
# Todos os testes
npm test

# Testes específicos
npm test -- --grep "VectorSearch"

# Com cobertura
npm run test:coverage

# Watch mode
npm run test:watch
```

## 📚 Documentação

### API Documentation

- Use **JSDoc** para documentar funções
- Mantenha **README.md** atualizado
- Documente endpoints na seção apropriada
- Adicione exemplos de uso

### Comentários no Código

```javascript
// ✅ Bom
/**
 * Calcula a similaridade entre dois vetores usando cosine similarity
 * Usado para ranking de exercícios similares
 */
function cosineSimilarity(vectorA, vectorB) {
  // implementação
}

// ❌ Evitar
// calcula similaridade
function calc(a, b) {
  // implementação
}
```

## 🏗️ Estrutura do Projeto

```
evolvefit/
├── backend/
│   ├── controllers/     # Controladores da API
│   ├── middleware/      # Middlewares customizados
│   ├── models/         # Modelos de dados
│   ├── routes/         # Definições de rotas
│   ├── services/       # Lógica de negócio
│   ├── utils/          # Utilitários
│   ├── migrations/     # Migrações do banco
│   └── tests/          # Testes
├── frontend/           # Arquivos estáticos
├── docs/              # Documentação adicional
└── scripts/           # Scripts de deploy e manutenção
```

## 🔄 Conventional Commits

Use o padrão de commits convencionais:

- **feat**: Nova funcionalidade
- **fix**: Correção de bug
- **docs**: Mudanças na documentação
- **style**: Formatação, ponto e vírgula, etc
- **refactor**: Refatoração de código
- **test**: Adição ou correção de testes
- **chore**: Manutenção, dependências, etc

Exemplos:
```bash
feat(auth): adicionar autenticação com Google OAuth
fix(api): corrigir erro 500 na rota de workouts
docs(readme): atualizar instruções de instalação
test(vector): adicionar testes para busca por similaridade
```

## 🚀 Deploy e CI/CD

### Antes do Merge

- [ ] Todos os testes passando
- [ ] Linting sem erros
- [ ] Documentação atualizada
- [ ] Review aprovado
- [ ] Branch atualizada com main

### GitHub Actions

O projeto usa GitHub Actions para:
- Executar testes automaticamente
- Verificar linting e formatação
- Deploy automático para staging
- Análise de segurança

## 📞 Dúvidas e Suporte

- **Issues**: Para bugs e sugestões
- **Discussions**: Para dúvidas gerais
- **Discord**: [Link do servidor] (se disponível)
- **Email**: dev@evolvefit.com

## 🎯 Prioridades Atuais

### High Priority
- [ ] Testes automatizados completos
- [ ] Documentação da API
- [ ] Performance optimization
- [ ] Security audit

### Medium Priority
- [ ] Mobile app (React Native)
- [ ] Real-time features
- [ ] Advanced analytics
- [ ] Social features

### Low Priority
- [ ] Gamification
- [ ] Wearable integration
- [ ] Video analysis
- [ ] Marketplace

## 🏆 Reconhecimento

Contribuidores são reconhecidos:
- No arquivo CONTRIBUTORS.md
- Nos release notes
- No README principal
- Em posts nas redes sociais

Obrigado por contribuir para o EvolveFit! 🚀