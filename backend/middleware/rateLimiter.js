const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('redis');

// Configuração do Redis (fallback para memória se não disponível)
let redisClient;
let useRedis = false;

try {
    redisClient = Redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        enableOfflineQueue: false
    });

    redisClient.on('connect', () => {
        console.log('✅ Redis connected for rate limiting');
        useRedis = true;
    });

    redisClient.on('error', (err) => {
        console.log('⚠️ Redis not available, using memory store for rate limiting:', err.message);
        useRedis = false;
    });
} catch (error) {
    console.log('⚠️ Redis not configured, using memory store for rate limiting');
    useRedis = false;
}

// Store factory - Redis ou memória
const createStore = () => {
    if (useRedis && redisClient) {
        return new RedisStore({
            client: redisClient,
            prefix: 'rl:evolvefit:'
        });
    }
    return undefined; // Usa MemoryStore padrão
};

// Rate limiter básico para endpoints gerais
const basicLimiter = rateLimit({
    store: createStore(),
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requests por IP
    message: {
        error: 'Muitas requisições. Tente novamente em 15 minutos.',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Usar user ID se autenticado, senão IP
        return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
    }
});

// Rate limiter rigoroso para endpoints de AI/LLM
const aiLimiter = rateLimit({
    store: createStore(),
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 20, // 20 requests por usuário por hora
    message: {
        error: 'Limite de requisições AI excedido. Tente novamente em 1 hora.',
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user?.id ? `ai:user:${req.user.id}` : `ai:ip:${req.ip}`;
    },
    skip: (req) => {
        // Pular rate limiting para usuários premium (se implementado)
        return req.user?.subscription === 'premium';
    }
});

// Rate limiter para autenticação
const authLimiter = rateLimit({
    store: createStore(),
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 tentativas de login por IP
    message: {
        error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `auth:${req.ip}`,
    skipSuccessfulRequests: true // Não contar requests bem-sucedidos
});

// Rate limiter para upload de arquivos
const uploadLimiter = rateLimit({
    store: createStore(),
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10, // 10 uploads por usuário por hora
    message: {
        error: 'Limite de uploads excedido. Tente novamente em 1 hora.',
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user?.id ? `upload:user:${req.user.id}` : `upload:ip:${req.ip}`;
    }
});

// Rate limiter para busca/search
const searchLimiter = rateLimit({
    store: createStore(),
    windowMs: 60 * 1000, // 1 minuto
    max: 30, // 30 buscas por minuto
    message: {
        error: 'Muitas buscas realizadas. Aguarde 1 minuto.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user?.id ? `search:user:${req.user.id}` : `search:ip:${req.ip}`;
    }
});

// Rate limiter dinâmico baseado no endpoint
const createDynamicLimiter = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000,
        max = 100,
        message = 'Rate limit exceeded',
        keyPrefix = 'dynamic'
    } = options;

    return rateLimit({
        store: createStore(),
        windowMs,
        max,
        message: {
            error: message,
            retryAfter: Math.floor(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => {
            const userId = req.user?.id;
            const endpoint = req.route?.path || req.path;
            return userId 
                ? `${keyPrefix}:user:${userId}:${endpoint}`
                : `${keyPrefix}:ip:${req.ip}:${endpoint}`;
        }
    });
};

// Middleware para aplicar rate limiting baseado no endpoint
const smartRateLimiter = (req, res, next) => {
    const path = req.path;
    const method = req.method;

    // Definir limites específicos por endpoint
    if (path.includes('/auth/') && method === 'POST') {
        return authLimiter(req, res, next);
    }
    
    if (path.includes('/generate') || path.includes('/analyze') || path.includes('/llm')) {
        return aiLimiter(req, res, next);
    }
    
    if (path.includes('/upload') || method === 'POST' && path.includes('/photos')) {
        return uploadLimiter(req, res, next);
    }
    
    if (path.includes('/search') || path.includes('/recommendations')) {
        return searchLimiter(req, res, next);
    }
    
    // Rate limiting básico para outros endpoints
    return basicLimiter(req, res, next);
};

// Middleware para bypass de rate limiting (para testes ou admin)
const bypassRateLimit = (req, res, next) => {
    // Verificar se é um usuário admin ou request de teste
    if (req.headers['x-bypass-rate-limit'] === process.env.RATE_LIMIT_BYPASS_KEY) {
        return next();
    }
    
    if (req.user?.role === 'admin') {
        return next();
    }
    
    // Aplicar rate limiting normal
    return smartRateLimiter(req, res, next);
};

// Função para obter estatísticas de rate limiting
const getRateLimitStats = async (userId) => {
    if (!useRedis || !redisClient) {
        return {
            error: 'Redis not available for stats',
            fallback: 'Using memory store'
        };
    }

    try {
        const keys = await redisClient.keys(`rl:evolvefit:*user:${userId}*`);
        const stats = {};
        
        for (const key of keys) {
            const ttl = await redisClient.ttl(key);
            const count = await redisClient.get(key);
            const keyParts = key.split(':');
            const endpoint = keyParts[keyParts.length - 1];
            
            stats[endpoint] = {
                requests: parseInt(count) || 0,
                resetIn: ttl > 0 ? ttl : 0
            };
        }
        
        return stats;
    } catch (error) {
        return {
            error: 'Failed to get rate limit stats',
            message: error.message
        };
    }
};

// Função para resetar rate limit de um usuário (admin)
const resetUserRateLimit = async (userId) => {
    if (!useRedis || !redisClient) {
        return { success: false, message: 'Redis not available' };
    }

    try {
        const keys = await redisClient.keys(`rl:evolvefit:*user:${userId}*`);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
        
        return { 
            success: true, 
            message: `Reset rate limit for user ${userId}`,
            keysDeleted: keys.length
        };
    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
};

// Middleware para logging de rate limit hits
const rateLimitLogger = (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
        // Log se foi rate limited
        if (res.statusCode === 429) {
            console.log(`🚫 Rate limit hit: ${req.method} ${req.path} - User: ${req.user?.id || 'anonymous'} - IP: ${req.ip}`);
        }
        
        return originalSend.call(this, data);
    };
    
    next();
};

module.exports = {
    basicLimiter,
    aiLimiter,
    authLimiter,
    uploadLimiter,
    searchLimiter,
    smartRateLimiter,
    bypassRateLimit,
    createDynamicLimiter,
    getRateLimitStats,
    resetUserRateLimit,
    rateLimitLogger
};