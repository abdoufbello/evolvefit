const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

/**
 * Middleware de autenticação JWT
 * Verifica se o token JWT é válido e adiciona os dados do usuário à requisição
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                error: 'Token de acesso requerido',
                code: 'MISSING_TOKEN'
            });
        }

        // Verificar se o token é válido
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Para testes sem banco de dados, usar apenas dados do token
        // TODO: Reativar consulta ao banco quando PostgreSQL estiver disponível
        /*
        const userQuery = 'SELECT id, email, name, created_at FROM users WHERE id = $1 AND active = true';
        const userResult = await pool.query(userQuery, [decoded.userId]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                error: 'Usuário não encontrado ou inativo',
                code: 'USER_NOT_FOUND'
            });
        }
        */

        // Adicionar dados do usuário à requisição (usando dados do token)
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            name: 'Teste Usuario', // Valor mockado para testes
            iat: decoded.iat,
            exp: decoded.exp
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Token inválido',
                code: 'INVALID_TOKEN'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expirado',
                code: 'TOKEN_EXPIRED'
            });
        }

        console.error('Erro no middleware de autenticação:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
};

/**
 * Middleware opcional de autenticação
 * Adiciona dados do usuário se o token for válido, mas não bloqueia se não houver token
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            req.user = null;
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const userQuery = 'SELECT id, email, name, created_at FROM users WHERE id = $1 AND active = true';
        const userResult = await pool.query(userQuery, [decoded.userId]);

        if (userResult.rows.length > 0) {
            req.user = {
                id: decoded.userId,
                email: decoded.email,
                name: userResult.rows[0].name,
                iat: decoded.iat,
                exp: decoded.exp
            };
        } else {
            req.user = null;
        }

        next();
    } catch (error) {
        // Em caso de erro, continuar sem autenticação
        req.user = null;
        next();
    }
};

/**
 * Gerar token JWT
 */
const generateToken = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

/**
 * Gerar refresh token
 */
const generateRefreshToken = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '30d' // Refresh token válido por 30 dias
    });
};

/**
 * Verificar refresh token
 */
const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.type !== 'refresh') {
            throw new Error('Token não é um refresh token');
        }

        return decoded;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    authenticateToken,
    optionalAuth,
    generateToken,
    generateRefreshToken,
    verifyRefreshToken
};