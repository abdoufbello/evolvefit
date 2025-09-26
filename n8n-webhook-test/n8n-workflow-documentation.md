# 📋 Documentação do Workflow n8n para EvolveFit

## 🎯 Visão Geral
Este documento descreve como configurar os workflows n8n para integração completa com a aplicação EvolveFit, incluindo geração inteligente de treinos via LLM e sincronização com Notion.

## 🔗 Webhooks Necessários

### 1. Webhook LLM - `evolvefit-llm`
**URL:** `https://n8n.leplustudio.top/webhook/evolvefit-llm`
**Método:** POST
**Função:** Processar solicitações de LLM para geração de treinos, análises de progresso e conselhos nutricionais.

### 2. Webhook Notion - `evolvefit-notion`
**URL:** `https://n8n.leplustudio.top/webhook/evolvefit-notion`
**Método:** POST
**Função:** Sincronizar dados com Notion (CRUD de alunos e progresso).

---

## 🤖 Workflow 1: LLM Integration (evolvefit-llm)

### Estrutura do Workflow:
```
Webhook Trigger → Validate Input → Route by Action → LLM Processing → Format Response → Return JSON
```

### Configuração Detalhada:

#### 1. **Webhook Trigger Node**
- **Tipo:** Webhook
- **Método HTTP:** POST
- **Path:** `/webhook/evolvefit-llm`
- **Response Mode:** Respond to Webhook

#### 2. **Validate Input Node** (Function)
```javascript
// Validar dados de entrada
const body = $json.body || $json;
const action = body.action;
const studentData = body.studentData;

if (!action || !studentData) {
  return [{
    json: {
      error: "Dados inválidos: action e studentData são obrigatórios",
      success: false
    }
  }];
}

return [{
  json: {
    action: action,
    studentData: studentData,
    timestamp: new Date().toISOString()
  }
}];
```

#### 3. **Route by Action Node** (Switch)
- **Mode:** Expression
- **Value:** `{{ $json.action }}`
- **Routes:**
  - `workoutGeneration` → Geração de Treino
  - `progressAnalysis` → Análise de Progresso  
  - `nutritionAdvice` → Conselhos Nutricionais

#### 4. **LLM Processing Nodes** (OpenAI/ChatGPT)

##### Para `workoutGeneration`:
```javascript
// Prompt para geração de treino
const student = $json.studentData;
const prompt = `
Você é um personal trainer especializado. Crie um plano de treino personalizado baseado nos seguintes dados:

Nome: ${student.name}
Idade: ${student.age} anos
Peso: ${student.weight}kg
Altura: ${student.height}cm
Objetivo: ${student.goal}
Lesões/Limitações: ${student.injuries || 'Nenhuma'}
Local de Treino: ${student.training?.location || 'Academia'}
Modalidade: ${student.training?.modality || 'Musculação'}

Benchmarks atuais:
- Agachamento: ${student.benchmark?.squat || 0}kg
- Supino: ${student.benchmark?.bench || 0}kg
- Leg Press: ${student.benchmark?.legpress || 0}kg
- Levantamento Terra: ${student.benchmark?.deadlift || 0}kg
- Pull-ups: ${student.benchmark?.pullups || 0} repetições
- Push-ups: ${student.benchmark?.pushups || 0} repetições

Retorne um JSON com:
{
  "workoutPlan": {
    "weeks": [
      {
        "week": 1,
        "days": [
          {
            "day": 1,
            "focus": "Peito e Tríceps",
            "exercises": [
              {
                "name": "Supino Reto",
                "sets": 4,
                "reps": "8-12",
                "weight": 60,
                "rest": "90s"
              }
            ]
          }
        ]
      }
    ]
  },
  "recommendations": ["Dica 1", "Dica 2"],
  "progressionPlan": "Plano de progressão detalhado"
}
`;

return [{
  json: {
    prompt: prompt,
    maxTokens: 2000,
    temperature: 0.7
  }
}];
```

##### Para `progressAnalysis`:
```javascript
// Prompt para análise de progresso
const student = $json.studentData;
const recentProgress = student.progress?.slice(-10) || [];

const prompt = `
Analise o progresso do aluno ${student.name} baseado nos dados:

Dados do Aluno:
- Objetivo: ${student.goal}
- Idade: ${student.age} anos
- Peso atual: ${student.weight}kg

Progresso Recente (últimos treinos):
${recentProgress.map(p => `
Data: ${p.date}
Exercícios: ${JSON.stringify(p.exercises)}
`).join('\n')}

Retorne um JSON com:
{
  "insights": "Análise detalhada do progresso",
  "recommendations": ["Recomendação 1", "Recomendação 2"],
  "nextGoals": ["Objetivo 1", "Objetivo 2"],
  "strengths": ["Ponto forte 1"],
  "improvements": ["Área para melhorar 1"]
}
`;

return [{
  json: {
    prompt: prompt,
    maxTokens: 1500,
    temperature: 0.6
  }
}];
```

##### Para `nutritionAdvice`:
```javascript
// Prompt para conselhos nutricionais
const student = $json.studentData;

const prompt = `
Forneça conselhos nutricionais personalizados para:

Nome: ${student.name}
Idade: ${student.age} anos
Peso: ${student.weight}kg
Altura: ${student.height}cm
Objetivo: ${student.goal}
Nível de Atividade: ${student.training?.modality || 'Moderado'}

Retorne um JSON com:
{
  "dailyCalories": 2200,
  "macros": {
    "protein": "150g",
    "carbs": "250g", 
    "fat": "80g"
  },
  "mealPlan": [
    {
      "meal": "Café da Manhã",
      "foods": ["Aveia", "Banana", "Whey Protein"]
    }
  ],
  "tips": ["Dica nutricional 1", "Dica nutricional 2"],
  "supplements": ["Suplemento recomendado 1"]
}
`;

return [{
  json: {
    prompt: prompt,
    maxTokens: 1200,
    temperature: 0.5
  }
}];
```

#### 5. **Format Response Node** (Function)
```javascript
// Formatar resposta do LLM
const llmResponse = $json.choices?.[0]?.message?.content || $json.response;

try {
  // Tentar parsear como JSON
  const parsedResponse = JSON.parse(llmResponse);
  
  return [{
    json: {
      success: true,
      data: parsedResponse,
      action: $('Route by Action').item.json.action,
      timestamp: new Date().toISOString()
    }
  }];
} catch (error) {
  // Se não for JSON válido, retornar como texto
  return [{
    json: {
      success: true,
      data: {
        text: llmResponse
      },
      action: $('Route by Action').item.json.action,
      timestamp: new Date().toISOString()
    }
  }];
}
```

---

## 📊 Workflow 2: Notion Integration (evolvefit-notion)

### Estrutura do Workflow:
```
Webhook Trigger → Validate Input → Route by Action → Notion Operations → Return Response
```

### Configuração Detalhada:

#### 1. **Webhook Trigger Node**
- **Tipo:** Webhook
- **Método HTTP:** POST
- **Path:** `/webhook/evolvefit-notion`

#### 2. **Validate Input Node** (Function)
```javascript
// Validar dados de entrada
const body = $json.body || $json;
const action = body.action; // 'create', 'update', 'delete', 'progress'
const studentData = body.studentData;

if (!action || !studentData) {
  return [{
    json: {
      error: "Dados inválidos: action e studentData são obrigatórios",
      success: false
    }
  }];
}

return [{
  json: {
    action: action,
    studentData: studentData,
    timestamp: new Date().toISOString()
  }
}];
```

#### 3. **Route by Action Node** (Switch)
- **Mode:** Expression
- **Value:** `{{ $json.action }}`
- **Routes:**
  - `create` → Criar Aluno
  - `update` → Atualizar Aluno
  - `delete` → Deletar Aluno
  - `progress` → Registrar Progresso

#### 4. **Notion Operations**

##### Para `create` - Criar Página de Aluno:
- **Node:** Notion
- **Operation:** Create a page
- **Database ID:** `[SEU_DATABASE_ID_ALUNOS]`
- **Properties:**
```json
{
  "Nome": "{{ $json.studentData.name }}",
  "Idade": {{ $json.studentData.age }},
  "Peso": {{ $json.studentData.weight }},
  "Altura": {{ $json.studentData.height }},
  "Objetivo": "{{ $json.studentData.goal }}",
  "Lesões": "{{ $json.studentData.injuries }}",
  "Local Treino": "{{ $json.studentData.training.location }}",
  "Modalidade": "{{ $json.studentData.training.modality }}",
  "Data Cadastro": "{{ $json.timestamp }}",
  "ID Sistema": "{{ $json.studentData.id }}"
}
```

##### Para `progress` - Registrar Progresso:
- **Node:** Notion  
- **Operation:** Create a page
- **Database ID:** `[SEU_DATABASE_ID_PROGRESSO]`
- **Properties:**
```json
{
  "Aluno": "{{ $json.studentData.name }}",
  "Data Treino": "{{ $json.studentData.lastWorkout.date }}",
  "Exercícios": "{{ JSON.stringify($json.studentData.lastWorkout.exercises) }}",
  "Observações": "{{ $json.studentData.lastWorkout.notes }}",
  "ID Aluno": "{{ $json.studentData.id }}"
}
```

#### 5. **Return Response Node** (Function)
```javascript
// Retornar resposta de sucesso
return [{
  json: {
    success: true,
    action: $('Route by Action').item.json.action,
    notionPageId: $json.id || null,
    timestamp: new Date().toISOString(),
    message: "Operação realizada com sucesso no Notion"
  }
}];
```

---

## 🔧 Configuração no Notion

### Database 1: Alunos
**Propriedades necessárias:**
- Nome (Title)
- Idade (Number)
- Peso (Number) 
- Altura (Number)
- Objetivo (Text)
- Lesões (Text)
- Local Treino (Select: Academia, Casa, Parque)
- Modalidade (Select: Musculação, Funcional, Cardio)
- Data Cadastro (Date)
- ID Sistema (Text)

### Database 2: Progresso
**Propriedades necessárias:**
- Aluno (Title)
- Data Treino (Date)
- Exercícios (Text)
- Observações (Text)
- ID Aluno (Text)

---

## 🧪 Teste dos Webhooks

### Exemplo de Payload para LLM:
```json
{
  "action": "workoutGeneration",
  "studentData": {
    "name": "João Silva",
    "age": 25,
    "weight": 75,
    "height": 175,
    "goal": "Hipertrofia",
    "injuries": "Nenhuma",
    "training": {
      "location": "Academia",
      "modality": "Musculação"
    },
    "benchmark": {
      "squat": 80,
      "bench": 60,
      "deadlift": 100,
      "pullups": 8,
      "pushups": 25
    }
  }
}
```

### Exemplo de Payload para Notion:
```json
{
  "action": "create",
  "studentData": {
    "id": "1234567890",
    "name": "João Silva",
    "age": 25,
    "weight": 75,
    "height": 175,
    "goal": "Hipertrofia",
    "injuries": "Nenhuma",
    "training": {
      "location": "Academia", 
      "modality": "Musculação"
    }
  }
}
```

---

## 🚀 Próximos Passos

1. **Configurar Credenciais:**
   - OpenAI API Key para LLM
   - Notion Integration Token
   - Database IDs do Notion

2. **Testar Webhooks:**
   - Usar Postman ou similar para testar payloads
   - Verificar logs do n8n para debugging

3. **Monitoramento:**
   - Configurar alertas para falhas
   - Logs de execução para auditoria

4. **Otimizações:**
   - Cache de respostas frequentes
   - Rate limiting se necessário
   - Retry automático em falhas

---

## 📞 Suporte
Para dúvidas sobre a implementação, verifique:
- Logs do n8n em tempo real
- Documentação oficial do n8n
- Status dos webhooks via interface web