const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { authenticateToken, generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting para rotas de autenticação
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 tentativas por IP
    message: {
        error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting mais restritivo para registro
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // máximo 3 registros por IP por hora
    message: {
        error: 'Muitas tentativas de registro. Tente novamente em 1 hora.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * POST /api/auth/register
 * Registrar novo usuário
 */
router.post('/register', registerLimiter, async (req, res) => {
    try {
        const { email, name, password } = req.body;

        // Validar dados de entrada
        const validationErrors = User.validateCreateData({ email, name, password });
        if (validationErrors.length > 0) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: validationErrors
            });
        }

        // Criar usuário
        const user = await User.create({ email, name, password });

        // Gerar tokens JWT
        const accessToken = generateToken(user);
        const refreshToken = generateRefreshToken(user);

        // Configurar cookie do refresh token
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
        });

        res.status(201).json({
            message: 'Usuário criado com sucesso',
            user: user.toJSON(),
            accessToken
        });

    } catch (error) {
        console.error('Erro no registro:', error);

        if (error.message === 'Email já está em uso') {
            return res.status(409).json({
                error: 'Email já está em uso'
            });
        }

        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * POST /api/auth/login
 * Fazer login
 */
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar dados de entrada
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email e senha são obrigatórios'
            });
        }

        // Buscar usuário
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                error: 'Credenciais inválidas'
            });
        }

        // Verificar senha
        const isValidPassword = await user.verifyPassword(password);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Credenciais inválidas'
            });
        }

        // Gerar tokens JWT
        const accessToken = generateToken(user);
        const refreshToken = generateRefreshToken(user);

        // Configurar cookie do refresh token
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
        });

        res.json({
            message: 'Login realizado com sucesso',
            user: user.toJSON(),
            accessToken
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * POST /api/auth/refresh
 * Renovar access token usando refresh token
 */
router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                error: 'Refresh token não fornecido'
            });
        }

        // Verificar refresh token
        const decoded = verifyRefreshToken(refreshToken);
        if (!decoded) {
            return res.status(401).json({
                error: 'Refresh token inválido'
            });
        }

        // Buscar usuário
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                error: 'Usuário não encontrado'
            });
        }

        // Gerar novos tokens
        const accessToken = generateToken(user);
        const newRefreshToken = generateRefreshToken(user);

        // Configurar novo cookie do refresh token
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
        });

        res.json({
            message: 'Token renovado com sucesso',
            accessToken
        });

    } catch (error) {
        console.error('Erro na renovação do token:', error);
        res.status(401).json({
            error: 'Erro ao renovar token'
        });
    }
});

/**
 * POST /api/auth/logout
 * Fazer logout (limpar refresh token)
 */
router.post('/logout', (req, res) => {
    res.clearCookie('refreshToken');
    res.json({
        message: 'Logout realizado com sucesso'
    });
});

/**
 * GET /api/auth/me
 * Obter dados do usuário atual
 */
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Token de acesso não fornecido'
            });
        }

        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);
            
            if (!user) {
                return res.status(401).json({
                    error: 'Usuário não encontrado'
                });
            }

            res.json({
                user: user.toJSON()
            });

        } catch (jwtError) {
            return res.status(401).json({
                error: 'Token inválido'
            });
        }

    } catch (error) {
        console.error('Erro ao obter dados do usuário:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * PUT /api/auth/profile
 * Atualizar perfil do usuário
 */
router.put('/profile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Token de acesso não fornecido'
            });
        }

        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);
            
            if (!user) {
                return res.status(401).json({
                    error: 'Usuário não encontrado'
                });
            }

            const { name } = req.body;

            // Validar nome
            if (!name || name.length < 2 || name.length > 100) {
                return res.status(400).json({
                    error: 'Nome deve ter entre 2 e 100 caracteres'
                });
            }

            // Atualizar perfil
            await user.updateProfile({ name });

            res.json({
                message: 'Perfil atualizado com sucesso',
                user: user.toJSON()
            });

        } catch (jwtError) {
            return res.status(401).json({
                error: 'Token inválido'
            });
        }

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * PUT /api/auth/password
 * Alterar senha do usuário
 */
router.put('/password', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Token de acesso não fornecido'
            });
        }

        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);
            
            if (!user) {
                return res.status(401).json({
                    error: 'Usuário não encontrado'
                });
            }

            const { currentPassword, newPassword } = req.body;

            // Validar dados de entrada
            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    error: 'Senha atual e nova senha são obrigatórias'
                });
            }

            if (newPassword.length < 6 || newPassword.length > 128) {
                return res.status(400).json({
                    error: 'Nova senha deve ter entre 6 e 128 caracteres'
                });
            }

            // Verificar senha atual
            const isValidPassword = await user.verifyPassword(currentPassword);
            if (!isValidPassword) {
                return res.status(400).json({
                    error: 'Senha atual incorreta'
                });
            }

            // Atualizar senha
            await user.updatePassword(newPassword);

            res.json({
                message: 'Senha alterada com sucesso'
            });

        } catch (jwtError) {
            return res.status(401).json({
                error: 'Token inválido'
            });
        }

    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

module.exports = router;