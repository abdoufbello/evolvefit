// Configurações dos Webhooks n8n para EvolveFit
const CONFIG = {
    // URLs dos webhooks n8n
    webhooks: {
        // Webhook para chamadas do LLM (geração de treinos, análises, etc.)
        llm: 'https://n8n.leplustudio.top/webhook/evolvefit-llm'
    },
    
    // Configurações da API Backend
    api: {
        baseUrl: window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://evolvefit.leplustudio.top',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            workouts: '/api/workouts',
            progress: '/api/progress',
            nutrition: '/api/nutrition'
        }
    },
    
    // Configurações de timeout e retry
    request: {
        timeout: 30000, // 30 segundos
        retryAttempts: 3,
        retryDelay: 1000 // 1 segundo
    },
    
    // Configurações específicas do LLM
    llm: {
        model: 'gpt-4',
        maxTokens: 2000,
        temperature: 0.7,
        // Prompts pré-definidos para diferentes funcionalidades
        prompts: {
            workoutGeneration: `
                Você é um personal trainer especializado. Gere um plano de treino personalizado baseado nos dados do aluno.
                
                Retorne APENAS um JSON válido com a seguinte estrutura:
                {
                    "workoutPlan": [
                        {
                            "week": 1,
                            "days": [
                                {
                                    "day": 1,
                                    "type": "treino",
                                    "focus": "Peito, Ombros e Tríceps",
                                    "exercises": [
                                        {
                                            "name": "Supino Reto",
                                            "sets": 3,
                                            "reps": "8-12",
                                            "weight": 0,
                                            "rest": "60-90s",
                                            "notes": "Foque na execução controlada"
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    "recommendations": "Recomendações específicas para o aluno",
                    "progressionPlan": "Como progredir nas próximas semanas"
                }
            `,
            progressAnalysis: `
                Analise o progresso do aluno baseado no histórico de treinos.
                
                Retorne APENAS um JSON válido com:
                {
                    "insights": "Análise detalhada do progresso",
                    "strengths": ["Pontos fortes identificados"],
                    "improvements": ["Áreas para melhorar"],
                    "recommendations": ["Recomendações específicas"],
                    "nextGoals": ["Próximos objetivos sugeridos"]
                }
            `,
            nutritionAdvice: `
                Forneça orientações nutricionais básicas baseadas no objetivo do aluno.
                
                Retorne APENAS um JSON válido com:
                {
                    "generalAdvice": "Orientações gerais de nutrição",
                    "macroSuggestions": "Sugestões de macronutrientes",
                    "hydration": "Orientações sobre hidratação",
                    "timing": "Timing de refeições para treino"
                }
            `
        }
    },
    
    // Configurações de desenvolvimento/produção
    environment: {
        isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
        enableLogs: true,
        enableNotifications: true
    },
    
    // Mensagens de feedback para o usuário
    messages: {
        llm: {
            generating: 'Gerando plano personalizado com IA...',
            success: 'Plano gerado com sucesso!',
            error: 'Erro ao gerar plano. Usando plano padrão.',
            analyzing: 'Analisando seu progresso...',
            analysisComplete: 'Análise de progresso concluída!'
        },
        database: {
            saving: 'Salvando dados...',
            success: 'Dados salvos com sucesso!',
            error: 'Erro ao salvar dados. Tente novamente.',
            loading: 'Carregando dados...',
            offline: 'Modo offline - dados serão sincronizados quando possível'
        }
    }
};

// Função para validar configuração
function validateConfig() {
    const requiredFields = [
        'webhooks.llm',
        'api.baseUrl'
    ];
    
    for (const field of requiredFields) {
        const keys = field.split('.');
        let current = CONFIG;
        
        for (const key of keys) {
            if (!current[key]) {
                console.error(`❌ Campo obrigatório não encontrado: ${field}`);
                return false;
            }
            current = current[key];
        }
    }
    
    return true;
}

// Função para obter configuração baseada no ambiente
function getEnvironmentConfig() {
    if (CONFIG.environment.isDevelopment) {
        return {
            ...CONFIG,
            webhooks: {
                llm: CONFIG.webhooks.llm.replace('n8n.leplustudio.top', 'localhost:5678')
            },
            api: {
                ...CONFIG.api,
                baseUrl: 'http://localhost:3000'
            }
        };
    }
    
    return CONFIG;
}

// Exportar configuração
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, validateConfig, getEnvironmentConfig };
}

// Log de inicialização
if (CONFIG.environment.enableLogs) {
    console.log('🚀 EvolveFit Config carregado:', {
        environment: CONFIG.environment.isDevelopment ? 'development' : 'production',
        webhooksConfigured: validateConfig(),
        llmEndpoint: CONFIG.webhooks.llm,
        apiBaseUrl: CONFIG.api.baseUrl
    });
}