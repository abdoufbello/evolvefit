const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

/**
 * GET /api/nutrition/recommendations
 * Obter recomendações nutricionais personalizadas
 */
router.get('/recommendations', authenticateToken, async (req, res) => {
    try {
        const { goal, activity_level, dietary_restrictions } = req.query;

        // Por enquanto, retorna recomendações mockadas
        // Futuramente, isso será integrado com LLM via n8n webhook
        const mockRecommendations = {
            user_id: req.user.userId,
            daily_calories: calculateCalories(goal, activity_level),
            macros: {
                protein: { grams: 150, percentage: 30 },
                carbs: { grams: 200, percentage: 40 },
                fat: { grams: 67, percentage: 30 }
            },
            meal_plan: [
                {
                    meal: 'Café da Manhã',
                    time: '07:00',
                    foods: [
                        { name: 'Aveia', quantity: '50g', calories: 190 },
                        { name: 'Banana', quantity: '1 unidade', calories: 105 },
                        { name: 'Leite desnatado', quantity: '200ml', calories: 70 }
                    ],
                    total_calories: 365
                },
                {
                    meal: 'Almoço',
                    time: '12:00',
                    foods: [
                        { name: 'Peito de frango', quantity: '150g', calories: 231 },
                        { name: 'Arroz integral', quantity: '100g', calories: 111 },
                        { name: 'Brócolis', quantity: '100g', calories: 34 }
                    ],
                    total_calories: 376
                }
            ],
            supplements: [
                { name: 'Whey Protein', dosage: '30g', timing: 'Pós-treino' },
                { name: 'Creatina', dosage: '5g', timing: 'Qualquer horário' }
            ],
            hydration: {
                daily_water: '2.5L',
                pre_workout: '500ml',
                post_workout: '750ml'
            },
            tips: [
                'Faça refeições a cada 3-4 horas',
                'Priorize proteínas magras',
                'Inclua vegetais em todas as refeições',
                'Evite alimentos processados'
            ]
        };

        res.json({
            recommendations: mockRecommendations
        });

    } catch (error) {
        console.error('Erro ao obter recomendações:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * POST /api/nutrition/analyze
 * Analisar nutrição com LLM via n8n webhook
 */
router.post('/analyze', authenticateToken, async (req, res) => {
    try {
        const { meals, period = '1d', user_data } = req.body;

        // Validações básicas
        if (!meals || !Array.isArray(meals) || meals.length === 0) {
            return res.status(400).json({
                error: 'Dados das refeições são obrigatórios'
            });
        }

        // Preparar dados para cache
        const cacheData = {
            userId: req.user.userId,
            meals: meals,
            period: period,
            goal: user_data?.goal || 'Condicionamento geral'
        };

        // Verificar cache primeiro
        const cachedAnalysis = req.cache.get('nutritionAnalysis', cacheData);
        if (cachedAnalysis) {
            return res.json({
                message: 'Análise nutricional realizada com sucesso (cache)',
                analysis: cachedAnalysis,
                source: 'cache'
            });
        }

        // Preparar dados para o webhook n8n
        const webhookData = {
            action: 'nutritionAnalysis',
            studentData: {
                userId: req.user.userId,
                name: user_data?.name || 'Usuário',
                age: user_data?.age || 25,
                weight: user_data?.weight || 70,
                height: user_data?.height || 170,
                goal: user_data?.goal || 'Condicionamento geral',
                activity_level: user_data?.activity_level || 'moderado',
                meals: meals,
                period: period,
                dietary_restrictions: user_data?.dietary_restrictions || [],
                preferences: user_data?.preferences || []
            }
        };

        try {
            // Chamar webhook n8n para análise LLM
            const axios = require('axios');
            const webhookUrl = process.env.N8N_LLM_WEBHOOK || 'https://n8n.leplustudio.top/webhook/evolvefit-llm';
            const webhookResponse = await axios.post(webhookUrl, webhookData, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (webhookResponse.data && webhookResponse.data.success) {
                // Armazenar no cache (TTL: 45 minutos para análises nutricionais)
                req.cache.set('nutritionAnalysis', cacheData, webhookResponse.data.data, 45 * 60 * 1000);
                
                res.json({
                    message: 'Análise nutricional realizada com sucesso via LLM',
                    analysis: webhookResponse.data.data,
                    source: 'llm'
                });
            } else {
                throw new Error('Resposta inválida do webhook');
            }

        } catch (webhookError) {
            console.error('Erro no webhook n8n:', webhookError.message);
            
            // Fallback: análise mockada
            const totalCalories = meals.reduce((sum, meal) => {
                return sum + (meal.foods?.reduce((mealSum, food) => 
                    mealSum + (food.calories || 0), 0) || 0);
            }, 0);

            const mockAnalysis = {
                user_id: req.user.userId,
                analysis_date: new Date().toISOString(),
                period: period,
                total_calories: totalCalories,
                macros: {
                    protein: Math.round(totalCalories * 0.25 / 4),
                    carbs: Math.round(totalCalories * 0.45 / 4),
                    fat: Math.round(totalCalories * 0.30 / 9)
                },
                recommendations: [
                    'Considere aumentar a ingestão de vegetais',
                    'Mantenha a hidratação adequada',
                    'Distribua as proteínas ao longo do dia'
                ],
                score: Math.min(10, Math.max(1, 5 + (totalCalories > 1500 ? 2 : -1))),
                insights: [
                    {
                        category: 'Calorias',
                        message: `Total de ${totalCalories} calorias consumidas`,
                        priority: totalCalories < 1200 ? 'high' : 'medium'
                    }
                ]
            };

            // Armazenar fallback no cache (TTL menor: 15 minutos)
            req.cache.set('nutritionAnalysis', cacheData, mockAnalysis, 15 * 60 * 1000);

            res.json({
                message: 'Análise nutricional realizada com sucesso (versão mockada)',
                analysis: mockAnalysis,
                source: 'fallback',
                note: 'Integração com LLM temporariamente indisponível'
            });
        }

    } catch (error) {
        console.error('Erro ao analisar nutrição:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * POST /api/nutrition/log
 * Registrar refeição/dados nutricionais
 */
router.post('/log', authenticateToken, async (req, res) => {
    try {
        const { 
            meal_type, 
            foods, 
            total_calories, 
            meal_time, 
            notes,
            water_intake 
        } = req.body;

        // Validações básicas
        if (!meal_type || !foods || !Array.isArray(foods)) {
            return res.status(400).json({
                error: 'Tipo de refeição e alimentos são obrigatórios'
            });
        }

        // Validar estrutura dos alimentos
        for (const food of foods) {
            if (!food.name || !food.quantity) {
                return res.status(400).json({
                    error: 'Cada alimento deve ter nome e quantidade'
                });
            }
        }

        // Por enquanto, simula o registro da refeição
        // Futuramente, isso será salvo no banco de dados
        const nutritionLog = {
            id: Date.now(),
            user_id: req.user.userId,
            date: new Date().toISOString().split('T')[0],
            meal_time: meal_time || new Date().toISOString(),
            meal_type: meal_type,
            foods: foods,
            total_calories: total_calories || foods.reduce((sum, food) => sum + (food.calories || 0), 0),
            notes: notes || '',
            water_intake: water_intake || null,
            created_at: new Date().toISOString()
        };

        res.status(201).json({
            message: 'Refeição registrada com sucesso',
            nutrition_log: nutritionLog
        });

    } catch (error) {
        console.error('Erro ao registrar refeição:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * GET /api/nutrition/history
 * Obter histórico nutricional
 */
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const { 
            start_date, 
            end_date, 
            meal_type,
            limit = 20, 
            offset = 0 
        } = req.query;

        // Por enquanto, retorna dados mockados
        // Futuramente, isso será integrado com o banco de dados
        const mockHistory = [
            {
                id: 1,
                date: '2024-01-29',
                meal_type: 'Café da Manhã',
                meal_time: '2024-01-29T07:30:00Z',
                foods: [
                    { name: 'Aveia', quantity: '50g', calories: 190 },
                    { name: 'Banana', quantity: '1 unidade', calories: 105 },
                    { name: 'Leite desnatado', quantity: '200ml', calories: 70 }
                ],
                total_calories: 365,
                notes: 'Café da manhã completo e nutritivo'
            },
            {
                id: 2,
                date: '2024-01-29',
                meal_type: 'Almoço',
                meal_time: '2024-01-29T12:15:00Z',
                foods: [
                    { name: 'Peito de frango', quantity: '150g', calories: 231 },
                    { name: 'Arroz integral', quantity: '100g', calories: 111 },
                    { name: 'Brócolis', quantity: '100g', calories: 34 }
                ],
                total_calories: 376,
                notes: 'Almoço balanceado pós-treino'
            }
        ];

        // Filtrar por tipo de refeição se especificado
        let filteredHistory = mockHistory;
        if (meal_type) {
            filteredHistory = mockHistory.filter(entry => 
                entry.meal_type.toLowerCase() === meal_type.toLowerCase()
            );
        }

        res.json({
            history: filteredHistory,
            total: filteredHistory.length,
            limit: parseInt(limit),
            offset: parseInt(offset),
            summary: {
                total_calories_today: filteredHistory.reduce((sum, entry) => sum + entry.total_calories, 0),
                meals_logged_today: filteredHistory.length,
                average_calories_per_meal: filteredHistory.length > 0 ? 
                    Math.round(filteredHistory.reduce((sum, entry) => sum + entry.total_calories, 0) / filteredHistory.length) : 0
            }
        });

    } catch (error) {
        console.error('Erro ao obter histórico nutricional:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * GET /api/nutrition/stats
 * Obter estatísticas nutricionais
 */
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const { period = '7d' } = req.query;

        // Por enquanto, retorna estatísticas mockadas
        // Futuramente, isso será calculado com base nos dados reais
        const mockStats = {
            user_id: req.user.userId,
            period: period,
            calories: {
                average_daily: 2150,
                target_daily: 2200,
                total_period: 15050,
                adherence_percentage: 97.7
            },
            macros: {
                protein: {
                    average_daily: 145,
                    target_daily: 150,
                    adherence_percentage: 96.7
                },
                carbs: {
                    average_daily: 195,
                    target_daily: 200,
                    adherence_percentage: 97.5
                },
                fat: {
                    average_daily: 65,
                    target_daily: 67,
                    adherence_percentage: 97.0
                }
            },
            meals: {
                total_logged: 21,
                most_frequent_meal: 'Almoço',
                average_meals_per_day: 3,
                consistency_score: 85
            },
            hydration: {
                average_daily_water: 2.3,
                target_daily_water: 2.5,
                best_day: '2024-01-27',
                adherence_percentage: 92
            },
            achievements: [
                { name: 'Meta de proteína atingida', date: '2024-01-25', type: 'macro' },
                { name: '7 dias consecutivos logados', date: '2024-01-29', type: 'consistency' },
                { name: 'Hidratação perfeita', date: '2024-01-27', type: 'hydration' }
            ]
        };

        res.json({
            stats: mockStats
        });

    } catch (error) {
        console.error('Erro ao obter estatísticas nutricionais:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

// Função auxiliar para calcular calorias baseado no objetivo
function calculateCalories(goal, activityLevel) {
    const baseCalories = {
        'sedentario': 1800,
        'leve': 2000,
        'moderado': 2200,
        'intenso': 2400,
        'muito_intenso': 2600
    };

    const goalMultiplier = {
        'perda_peso': 0.85,
        'manutencao': 1.0,
        'ganho_peso': 1.15,
        'hipertrofia': 1.1
    };

    const base = baseCalories[activityLevel] || 2000;
    const multiplier = goalMultiplier[goal] || 1.0;

    return Math.round(base * multiplier);
}

module.exports = router;