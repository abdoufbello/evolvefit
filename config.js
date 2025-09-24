// Configurações da aplicação EvolveFit
const CONFIG = {
    // URLs dos webhooks n8n (configure com suas URLs reais)
    webhooks: {
        // Webhook para chamadas LLM (geração de treinos inteligentes)
        llm: 'https://n8n.leplustudio.top/webhook/evolvefit-llm',
        
        // Webhook para sincronização com Notion
        notion: 'https://n8n.leplustudio.top/webhook/evolvefit-notion',
        
        // Webhook para análise de progresso
        analysis: 'https://n8n.leplustudio.top/webhook/evolvefit-analysis'
    },
    
    // Configurações da aplicação
    app: {
        name: 'EvolveFit',
        version: '1.0.0',
        environment: 'production'
    },
    
    // Configurações de cache e sincronização
    sync: {
        // Intervalo de sincronização com Notion (em minutos)
        interval: 30,
        
        // Tentativas de retry em caso de falha
        retryAttempts: 3,
        
        // Delay entre tentativas (em ms)
        retryDelay: 2000
    },
    
    // Configurações de LLM
    llm: {
        // Timeout para chamadas LLM (em ms)
        timeout: 30000,
        
        // Modelos disponíveis
        models: {
            workout: 'gpt-4-turbo',
            analysis: 'gpt-3.5-turbo',
            recommendations: 'gpt-4'
        }
    }
};

// Exportar configurações
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}