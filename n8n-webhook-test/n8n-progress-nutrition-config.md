# 🔧 Configuração n8n - Análise de Progresso e Conselhos Nutricionais

## 📋 Visão Geral
Este documento fornece a configuração completa para os workflows de **Análise de Progresso** e **Conselhos Nutricionais** no n8n, mantendo compatibilidade com as funcionalidades atuais do EvolveFit.

---

## 🚀 Workflow: Análise de Progresso

### 📊 **Status Atual:** ✅ FUNCIONANDO (HTTP 200 OK)

### 🔗 **Configuração do Webhook:**
- **URL:** `https://n8n.leplustudio.top/webhook/evolvefit-llm`
- **Método:** POST
- **Action:** `progressAnalysis`

### 🏗️ **Estrutura do Workflow:**
```
Webhook → Validação → Roteamento → LLM (Análise) → Formatação → Resposta
```

### ⚙️ **Configuração Detalhada:**

#### 1. **Webhook Trigger Node**
```json
{
  "name": "Webhook - Progress Analysis",
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "httpMethod": "POST",
    "path": "evolvefit-llm",
    "responseMode": "responseNode"
  }
}
```

#### 2. **Function Node - Validação de Entrada**
```javascript
// Validar dados de entrada para análise de progresso
const body = $json.body || $json;
const action = body.action;
const studentData = body.studentData;

// Verificar se é análise de progresso
if (action !== 'progressAnalysis') {
  return [];
}

// Validar dados obrigatórios
if (!studentData || !studentData.name) {
  return [{
    json: {
      error: "Dados inválidos: studentData.name é obrigatório",
      success: false
    }
  }];
}

// Estruturar dados para análise
return [{
  json: {
    action: action,
    studentData: {
      name: studentData.name,
      age: studentData.age || 25,
      weight: studentData.weight || 70,
      height: studentData.height || 170,
      goal: studentData.goal || "Melhoria geral",
      injuries: studentData.injuries || "Nenhuma",
      training: studentData.training || {
        location: "Academia",
        modality: "Musculação"
      },
      benchmark: studentData.benchmark || {},
      progress: studentData.progress || {
        currentWeek: 1,
        completedWorkouts: 0,
        totalWorkouts: 12,
        improvements: [],
        challenges: []
      }
    },
    timestamp: new Date().toISOString()
  }
}];
```

#### 3. **OpenAI Node - Análise de Progresso**
```json
{
  "name": "OpenAI - Progress Analysis",
  "type": "n8n-nodes-base.openAi",
  "parameters": {
    "operation": "chat",
    "model": "gpt-4",
    "messages": {
      "messageType": "define",
      "values": [
        {
          "role": "system",
          "content": "Você é um personal trainer especializado em análise de progresso. Analise os dados do aluno e forneça insights detalhados sobre seu desenvolvimento."
        },
        {
          "role": "user", 
          "content": "={{ $json.prompt }}"
        }
      ]
    },
    "maxTokens": 1500,
    "temperature": 0.6
  }
}
```

#### 4. **Function Node - Prompt de Análise**
```javascript
// Gerar prompt para análise de progresso
const student = $json.studentData;
const progress = student.progress || {};

const prompt = `
Analise o progresso do aluno baseado nos seguintes dados:

**DADOS DO ALUNO:**
- Nome: ${student.name}
- Idade: ${student.age} anos
- Peso: ${student.weight}kg
- Altura: ${student.height}cm
- Objetivo: ${student.goal}
- Lesões/Limitações: ${student.injuries}

**TREINO ATUAL:**
- Local: ${student.training.location}
- Modalidade: ${student.training.modality}

**BENCHMARKS ATUAIS:**
- Agachamento: ${student.benchmark.squat || 0}kg
- Supino: ${student.benchmark.bench || 0}kg
- Leg Press: ${student.benchmark.legpress || 0}kg
- Levantamento Terra: ${student.benchmark.deadlift || 0}kg
- Pull-ups: ${student.benchmark.pullups || 0} repetições
- Push-ups: ${student.benchmark.pushups || 0} repetições

**PROGRESSO ATUAL:**
- Semana: ${progress.currentWeek || 1}
- Treinos Completados: ${progress.completedWorkouts || 0}/${progress.totalWorkouts || 12}
- Melhorias Observadas: ${progress.improvements?.join(', ') || 'Nenhuma registrada'}
- Desafios Enfrentados: ${progress.challenges?.join(', ') || 'Nenhum registrado'}

**INSTRUÇÕES:**
Retorne APENAS um JSON válido com a seguinte estrutura:

{
  "analysis": {
    "overallProgress": "Análise geral do progresso (2-3 frases)",
    "strengths": ["Ponto forte 1", "Ponto forte 2"],
    "areasForImprovement": ["Área para melhorar 1", "Área para melhorar 2"],
    "progressScore": 85
  },
  "recommendations": {
    "immediate": ["Recomendação imediata 1", "Recomendação imediata 2"],
    "shortTerm": ["Objetivo de curto prazo 1", "Objetivo de curto prazo 2"],
    "longTerm": ["Objetivo de longo prazo 1"]
  },
  "nextGoals": {
    "strength": "Próximo objetivo de força",
    "endurance": "Próximo objetivo de resistência",
    "technique": "Foco técnico para próximas semanas"
  },
  "motivationalMessage": "Mensagem motivacional personalizada"
}
`;

return [{
  json: {
    prompt: prompt,
    studentData: student
  }
}];
```

#### 5. **Function Node - Formatação da Resposta**
```javascript
// Formatar resposta da análise de progresso
const llmResponse = $json.choices?.[0]?.message?.content || $json.response;

try {
  // Tentar parsear como JSON
  const analysisData = JSON.parse(llmResponse);
  
  return [{
    json: {
      success: true,
      action: "progressAnalysis",
      data: {
        studentName: $('Function - Validação de Entrada').item.json.studentData.name,
        analysis: analysisData.analysis,
        recommendations: analysisData.recommendations,
        nextGoals: analysisData.nextGoals,
        motivationalMessage: analysisData.motivationalMessage,
        generatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    }
  }];
} catch (error) {
  // Fallback se não for JSON válido
  return [{
    json: {
      success: true,
      action: "progressAnalysis",
      data: {
        studentName: $('Function - Validação de Entrada').item.json.studentData.name,
        analysis: {
          overallProgress: llmResponse,
          progressScore: 75
        },
        recommendations: {
          immediate: ["Continue o bom trabalho!", "Mantenha a consistência"]
        },
        generatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    }
  }];
}
```

---

## 🥗 Workflow: Conselhos Nutricionais

### 🔗 **Configuração do Webhook:**
- **URL:** `https://n8n.leplustudio.top/webhook/evolvefit-llm`
- **Método:** POST
- **Action:** `nutritionAdvice`

### 🏗️ **Estrutura do Workflow:**
```
Webhook → Validação → Roteamento → LLM (Nutrição) → Formatação → Resposta
```

### ⚙️ **Configuração Detalhada:**

#### 1. **Function Node - Validação Nutricional**
```javascript
// Validar dados de entrada para conselhos nutricionais
const body = $json.body || $json;
const action = body.action;
const studentData = body.studentData;

// Verificar se é conselho nutricional
if (action !== 'nutritionAdvice') {
  return [];
}

// Validar dados obrigatórios
if (!studentData || !studentData.name) {
  return [{
    json: {
      error: "Dados inválidos: studentData.name é obrigatório",
      success: false
    }
  }];
}

// Calcular TMB (Taxa Metabólica Basal)
const weight = studentData.weight || 70;
const height = studentData.height || 170;
const age = studentData.age || 25;

// Fórmula de Harris-Benedict
const bmr = weight * 10 + height * 6.25 - age * 5 + 5; // Para homens
const activityMultiplier = 1.6; // Ativo (academia)
const dailyCalories = Math.round(bmr * activityMultiplier);

return [{
  json: {
    action: action,
    studentData: studentData,
    calculatedBMR: bmr,
    estimatedCalories: dailyCalories,
    timestamp: new Date().toISOString()
  }
}];
```

#### 2. **Function Node - Prompt Nutricional**
```javascript
// Gerar prompt para conselhos nutricionais
const student = $json.studentData;
const calories = $json.estimatedCalories;

const prompt = `
Forneça conselhos nutricionais personalizados baseado nos dados:

**DADOS DO ALUNO:**
- Nome: ${student.name}
- Idade: ${student.age} anos
- Peso: ${student.weight}kg
- Altura: ${student.height}cm
- Objetivo: ${student.goal}
- Calorias Estimadas: ${calories} kcal/dia

**TREINO:**
- Local: ${student.training?.location || 'Academia'}
- Modalidade: ${student.training?.modality || 'Musculação'}
- Frequência: 4-5x por semana

**INSTRUÇÕES:**
Retorne APENAS um JSON válido com a seguinte estrutura:

{
  "nutritionPlan": {
    "dailyCalories": ${calories},
    "macros": {
      "protein": "150g (30%)",
      "carbs": "250g (45%)", 
      "fat": "80g (25%)"
    },
    "waterIntake": "3-4 litros/dia"
  },
  "mealPlan": [
    {
      "meal": "Café da Manhã",
      "time": "07:00",
      "foods": ["Aveia 50g", "Banana 1 unidade", "Whey Protein 30g"],
      "calories": 400
    },
    {
      "meal": "Lanche da Manhã", 
      "time": "10:00",
      "foods": ["Castanhas 30g", "Maçã 1 unidade"],
      "calories": 200
    },
    {
      "meal": "Almoço",
      "time": "12:30", 
      "foods": ["Arroz integral 100g", "Frango grelhado 150g", "Brócolis 100g"],
      "calories": 500
    },
    {
      "meal": "Pré-treino",
      "time": "15:30",
      "foods": ["Banana 1 unidade", "Café preto"],
      "calories": 100
    },
    {
      "meal": "Pós-treino",
      "time": "17:30", 
      "foods": ["Whey Protein 30g", "Dextrose 20g"],
      "calories": 200
    },
    {
      "meal": "Jantar",
      "time": "19:30",
      "foods": ["Batata doce 150g", "Salmão 120g", "Salada verde"],
      "calories": 450
    }
  ],
  "supplements": [
    {
      "name": "Whey Protein",
      "dosage": "30g",
      "timing": "Pós-treino e café da manhã"
    },
    {
      "name": "Creatina",
      "dosage": "5g",
      "timing": "Qualquer horário"
    }
  ],
  "tips": [
    "Hidrate-se bem durante o treino",
    "Faça refeições a cada 3 horas",
    "Priorize alimentos naturais"
  ]
}
`;

return [{
  json: {
    prompt: prompt,
    studentData: student,
    calories: calories
  }
}];
```

#### 3. **Function Node - Formatação Nutricional**
```javascript
// Formatar resposta dos conselhos nutricionais
const llmResponse = $json.choices?.[0]?.message?.content || $json.response;

try {
  // Tentar parsear como JSON
  const nutritionData = JSON.parse(llmResponse);
  
  return [{
    json: {
      success: true,
      action: "nutritionAdvice",
      data: {
        studentName: $('Function - Validação Nutricional').item.json.studentData.name,
        nutritionPlan: nutritionData.nutritionPlan,
        mealPlan: nutritionData.mealPlan,
        supplements: nutritionData.supplements,
        tips: nutritionData.tips,
        generatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    }
  }];
} catch (error) {
  // Fallback se não for JSON válido
  const calories = $('Function - Validação Nutricional').item.json.estimatedCalories;
  
  return [{
    json: {
      success: true,
      action: "nutritionAdvice", 
      data: {
        studentName: $('Function - Validação Nutricional').item.json.studentData.name,
        nutritionPlan: {
          dailyCalories: calories,
          macros: {
            protein: "150g",
            carbs: "250g",
            fat: "80g"
          }
        },
        tips: ["Mantenha uma alimentação equilibrada", "Hidrate-se bem"],
        generatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    }
  }];
}
```

---

## 🔧 Configuração no n8n

### 📋 **Passos para Implementação:**

1. **Acesse o n8n:** `https://n8n.leplustudio.top`

2. **Localize o workflow:** `evolvefit-llm`

3. **Adicione os nós conforme a estrutura:**
   - Webhook Trigger (já existe)
   - Function - Validação de Entrada (modificar)
   - Switch - Roteamento por Action (modificar)
   - Function - Prompt de Análise (novo)
   - OpenAI - Progress Analysis (novo)
   - Function - Prompt Nutricional (novo) 
   - OpenAI - Nutrition Advice (novo)
   - Function - Formatação (modificar)

4. **Configure as credenciais OpenAI**

5. **Ative o workflow**

6. **Teste usando:** `http://localhost:8002/test-webhook.html`

### ✅ **Checklist de Configuração:**
- [ ] Webhook configurado corretamente
- [ ] Credenciais OpenAI adicionadas
- [ ] Nós de validação implementados
- [ ] Prompts de análise configurados
- [ ] Prompts nutricionais configurados
- [ ] Formatação de resposta implementada
- [ ] Workflow ativado
- [ ] Testes realizados

---

## 🧪 **Dados de Teste:**

### **Análise de Progresso:**
```json
{
  "action": "progressAnalysis",
  "studentData": {
    "name": "João Silva",
    "age": 25,
    "weight": 75,
    "height": 175,
    "goal": "Hipertrofia",
    "progress": {
      "currentWeek": 4,
      "completedWorkouts": 12,
      "improvements": ["Aumento de 5kg no supino"],
      "challenges": ["Dificuldade no deadlift"]
    }
  }
}
```

### **Conselhos Nutricionais:**
```json
{
  "action": "nutritionAdvice", 
  "studentData": {
    "name": "João Silva",
    "age": 25,
    "weight": 75,
    "height": 175,
    "goal": "Hipertrofia"
  }
}
```