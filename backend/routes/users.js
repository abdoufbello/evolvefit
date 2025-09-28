const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

/**
 * GET /api/users/profile
 * Obter perfil do usuário atual
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({
                error: 'Usuário não encontrado'
            });
        }

        res.json({
            user: user.toJSON()
        });

    } catch (error) {
        console.error('Erro ao obter perfil:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * PUT /api/users/profile
 * Atualizar perfil do usuário atual
 */
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({
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

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * GET /api/users/preferences
 * Obter preferências do usuário (placeholder para futuras implementações)
 */
router.get('/preferences', authenticateToken, async (req, res) => {
    try {
        // Por enquanto, retorna preferências padrão
        // Futuramente, isso pode ser expandido para incluir preferências específicas do usuário
        const defaultPreferences = {
            theme: 'light',
            language: 'pt-BR',
            notifications: {
                email: true,
                push: true,
                workout_reminders: true
            },
            units: {
                weight: 'kg',
                distance: 'km'
            }
        };

        res.json({
            preferences: defaultPreferences
        });

    } catch (error) {
        console.error('Erro ao obter preferências:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * PUT /api/users/preferences
 * Atualizar preferências do usuário (placeholder para futuras implementações)
 */
router.put('/preferences', authenticateToken, async (req, res) => {
    try {
        const { theme, language, notifications, units } = req.body;

        // Validações básicas
        const validThemes = ['light', 'dark'];
        const validLanguages = ['pt-BR', 'en-US'];

        if (theme && !validThemes.includes(theme)) {
            return res.status(400).json({
                error: 'Tema inválido'
            });
        }

        if (language && !validLanguages.includes(language)) {
            return res.status(400).json({
                error: 'Idioma inválido'
            });
        }

        // Por enquanto, apenas simula a atualização
        // Futuramente, isso será salvo no banco de dados
        const updatedPreferences = {
            theme: theme || 'light',
            language: language || 'pt-BR',
            notifications: notifications || {
                email: true,
                push: true,
                workout_reminders: true
            },
            units: units || {
                weight: 'kg',
                distance: 'km'
            }
        };

        res.json({
            message: 'Preferências atualizadas com sucesso',
            preferences: updatedPreferences
        });

    } catch (error) {
        console.error('Erro ao atualizar preferências:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

module.exports = router;