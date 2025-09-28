/**
 * Sistema de Cache para Respostas LLM
 * Implementa cache em memória com TTL para otimizar performance
 */

class LLMCache {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 30 * 60 * 1000; // 30 minutos em milliseconds
        
        // Limpeza automática do cache a cada 10 minutos
        setInterval(() => {
            this.cleanup();
        }, 10 * 60 * 1000);
    }

    /**
     * Gera chave única para o cache baseada nos dados da requisição
     */
    generateKey(action, data) {
        const keyData = {
            action,
            userId: data.userId,
            // Para workout generation
            goal: data.goal,
            experience: data.experience,
            equipment: data.equipment,
            // Para progress analysis
            period: data.period,
            metrics: data.metrics ? JSON.stringify(data.metrics) : null,
            // Para nutrition analysis
            meals: data.meals ? JSON.stringify(data.meals) : null
        };

        // Remove propriedades null/undefined
        Object.keys(keyData).forEach(key => {
            if (keyData[key] === null || keyData[key] === undefined) {
                delete keyData[key];
            }
        });

        return `${action}_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
    }

    /**
     * Armazena resposta no cache
     */
    set(key, data, ttl = null) {
        const expiresAt = Date.now() + (ttl || this.defaultTTL);
        
        this.cache.set(key, {
            data,
            expiresAt,
            createdAt: Date.now()
        });

        console.log(`Cache: Armazenada resposta para chave ${key.substring(0, 20)}...`);
    }

    /**
     * Recupera resposta do cache
     */
    get(key) {
        const cached = this.cache.get(key);
        
        if (!cached) {
            return null;
        }

        // Verifica se expirou
        if (Date.now() > cached.expiresAt) {
            this.cache.delete(key);
            console.log(`Cache: Chave expirada removida ${key.substring(0, 20)}...`);
            return null;
        }

        console.log(`Cache: Hit para chave ${key.substring(0, 20)}...`);
        return cached.data;
    }

    /**
     * Remove entrada específica do cache
     */
    delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            console.log(`Cache: Removida chave ${key.substring(0, 20)}...`);
        }
        return deleted;
    }

    /**
     * Limpa entradas expiradas
     */
    cleanup() {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [key, value] of this.cache.entries()) {
            if (now > value.expiresAt) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`Cache: Limpeza automática removeu ${cleanedCount} entradas expiradas`);
        }
    }

    /**
     * Limpa todo o cache
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        console.log(`Cache: Limpeza total removeu ${size} entradas`);
    }

    /**
     * Retorna estatísticas do cache
     */
    getStats() {
        const now = Date.now();
        let activeEntries = 0;
        let expiredEntries = 0;

        for (const [key, value] of this.cache.entries()) {
            if (now > value.expiresAt) {
                expiredEntries++;
            } else {
                activeEntries++;
            }
        }

        return {
            totalEntries: this.cache.size,
            activeEntries,
            expiredEntries,
            memoryUsage: process.memoryUsage().heapUsed
        };
    }

    /**
     * Invalida cache por padrão (útil para invalidar cache de usuário específico)
     */
    invalidateByPattern(pattern) {
        let invalidatedCount = 0;
        
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
                invalidatedCount++;
            }
        }

        console.log(`Cache: Invalidadas ${invalidatedCount} entradas com padrão "${pattern}"`);
        return invalidatedCount;
    }

    /**
     * Middleware para cache automático de respostas LLM
     */
    middleware() {
        return (req, res, next) => {
            // Adiciona métodos de cache ao objeto request
            req.cache = {
                get: (action, data) => this.get(this.generateKey(action, data)),
                set: (action, data, response, ttl) => this.set(this.generateKey(action, data), response, ttl),
                invalidate: (pattern) => this.invalidateByPattern(pattern)
            };
            
            next();
        };
    }
}

// Instância singleton do cache
const llmCache = new LLMCache();

module.exports = {
    LLMCache,
    llmCache
};