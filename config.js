// Configurações dos Webhooks n8n para EvolveFit
const CONFIG = {
    // URLs dos webhooks n8n
    webhooks: {
        // Webhook para chamadas do LLM (geração de treinos, análises, etc.)
        llm: 'https://n8n.leplustudio.top/webhook/evolvefit-llm',
        
        // Webhook para sincronização com Notion
        notion: 'https://n8n.leplustudio.top/webhook/evolvefit-notion'
    },
    
    // Configurações de timeout e retry
    api: {
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
    
    // Configurações do Notion
    notion: {
        // Estrutura dos dados que serão enviados para o Notion
        studentSchema: {
            name: 'title',
            goal: 'select',
            age: 'number',
            weight: 'number',
            height: 'number',
            injuries: 'rich_text',
            trainingLocation: 'select',
            trainingModality: 'select',
            createdAt: 'date',
            lastUpdate: 'date'
        },
        
        progressSchema: {
            studentName: 'relation',
            date: 'date',
            exercise: 'select',
            weight: 'number',
            reps: 'number',
            week: 'number',
            day: 'number'
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
        notion: {
            syncing: 'Sincronizando com Notion...',
            success: 'Dados sincronizados com sucesso!',
            error: 'Erro na sincronização. Dados salvos localmente.',
            offline: 'Modo offline - dados serão sincronizados quando possível'
        }
    }
};

// Função para validar configuração
function validateConfig() {
    const requiredFields = [
        'webhooks.llm',
        'webhooks.notion'
    ];
    
    for (const field of requiredFields) {
        const value = field.split('.').reduce((obj, key) => obj?.[key], CONFIG);
        if (!value) {
            console.warn(`Configuração obrigatória ausente: ${field}`);
            return false;
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
                llm: CONFIG.webhooks.llm.replace('n8n.leplustudio.top', 'localhost:5678'),
                notion: CONFIG.webhooks.notion.replace('n8n.leplustudio.top', 'localhost:5678')
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
        notionEndpoint: CONFIG.webhooks.notion
    });
}