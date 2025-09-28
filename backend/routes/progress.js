const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/progress
 * Obter dados de progresso do usuário
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { period = '30d' } = req.query;

        // Por enquanto, retorna dados mockados
        // Futuramente, isso será integrado com o banco de dados
        const mockProgressData = {
            user_id: req.user.userId,
            period: period,
            summary: {
                total_workouts: 24,
                total_exercises: 156,
                total_weight_lifted: 12450, // kg
                average_workout_duration: 58, // minutos
                consistency_score: 85 // %
            },
            weight_progress: [
                { date: '2024-01-01', weight: 75.2 },
                { date: '2024-01-08', weight: 75.0 },
                { date: '2024-01-15', weight: 74.8 },
                { date: '2024-01-22', weight: 74.5 },
                { date: '2024-01-29', weight: 74.3 }
            ],
            strength_progress: [
                { exercise: 'Supino Reto', initial_weight: 70, current_weight: 85, improvement: 21.4 },
                { exercise: 'Agachamento', initial_weight: 80, current_weight: 100, improvement: 25.0 },
                { exercise: 'Levantamento Terra', initial_weight: 90, current_weight: 120, improvement: 33.3 }
            ],
            workout_frequency: {
                monday: 4,
                tuesday: 3,
                wednesday: 4,
                thursday: 3,
                friday: 4,
                saturday: 3,
                sunday: 2
            },
            goals_progress: [
                { goal: 'Perder 3kg', current: 2.2, target: 3.0, percentage: 73.3 },
                { goal: 'Supino 90kg', current: 85, target: 90, percentage: 94.4 },
                { goal: 'Treinar 4x/semana', current: 3.5, target: 4.0, percentage: 87.5 }
            ]
        };

        res.json({
            progress: mockProgressData
        });

    } catch (error) {
        console.error('Erro ao obter dados de progresso:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * POST /api/progress/analyze
 * Analisar progresso com LLM via n8n webhook
 */
router.post('/analyze', authenticateToken, async (req, res) => {
    try {
        const { period, metrics, user_data } = req.body;

        // Validações básicas
        if (!period || !metrics) {
            return res.status(400).json({
                error: 'Período e métricas são obrigatórios para análise'
            });
        }

        // Preparar dados para cache
        const cacheData = {
            userId: req.user.userId,
            period: period,
            metrics: metrics,
            goal: user_data?.goal || 'Condicionamento geral'
        };

        // Verificar cache primeiro
        const cachedAnalysis = req.cache.get('progressAnalysis', cacheData);
        if (cachedAnalysis) {
            return res.json({
                message: 'Análise de progresso realizada com sucesso (cache)',
                analysis: cachedAnalysis,
                source: 'cache',
                period: period
            });
        }

        // Preparar dados para o webhook n8n
        const webhookData = {
            action: 'progressAnalysis',
            studentData: {
                userId: req.user.userId,
                name: user_data?.name || 'Usuário',
                age: user_data?.age || 25,
                weight: user_data?.weight || 70,
                height: user_data?.height || 170,
                goal: user_data?.goal || 'Condicionamento geral',
                experience: user_data?.experience || 'intermediario',
                period: period,
                metrics: metrics,
                progressData: {
                    workouts_completed: metrics.workouts_completed || 0,
                    total_weight_lifted: metrics.total_weight_lifted || 0,
                    avg_workout_duration: metrics.avg_workout_duration || 0,
                    strength_gains: metrics.strength_gains || {},
                    body_composition: metrics.body_composition || {},
                    performance_metrics: metrics.performance_metrics || {}
                },
                training: {
                    location: user_data?.training?.location || 'Academia',
                    modality: user_data?.training?.modality || 'Musculação',
                    frequency: user_data?.training?.frequency || 3
                }
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
                // Armazenar no cache (TTL: 1 hora para análises)
                req.cache.set('progressAnalysis', cacheData, webhookResponse.data.data, 60 * 60 * 1000);
                
                res.json({
                    message: 'Análise de progresso realizada com sucesso via LLM',
                    analysis: webhookResponse.data.data,
                    source: 'llm',
                    period: period
                });
            } else {
                throw new Error('Resposta inválida do webhook');
            }

        } catch (webhookError) {
            console.error('Erro no webhook n8n:', webhookError.message);
            
            // Fallback: análise mockada personalizada
            const mockAnalysis = generateMockAnalysis(period, metrics, user_data);

            // Armazenar fallback no cache (TTL menor: 20 minutos)
            req.cache.set('progressAnalysis', cacheData, mockAnalysis, 20 * 60 * 1000);

            res.json({
                message: 'Análise de progresso realizada com sucesso (versão mockada)',
                analysis: mockAnalysis,
                source: 'fallback',
                period: period,
                note: 'Integração com LLM temporariamente indisponível'
            });
        }

    } catch (error) {
        console.error('Erro ao analisar progresso:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * POST /api/progress/log
 * Registrar progresso de treino
 */
router.post('/log', authenticateToken, async (req, res) => {
    try {
        const { 
            workout_id, 
            exercises, 
            duration, 
            notes, 
            body_weight, 
            energy_level,
            difficulty_rating 
        } = req.body;

        // Validações básicas
        if (!workout_id || !exercises || !Array.isArray(exercises)) {
            return res.status(400).json({
                error: 'ID do workout e exercícios são obrigatórios'
            });
        }

        // Validar estrutura dos exercícios
        for (const exercise of exercises) {
            if (!exercise.name || !exercise.sets || !Array.isArray(exercise.sets)) {
                return res.status(400).json({
                    error: 'Cada exercício deve ter nome e séries válidas'
                });
            }
        }

        // Por enquanto, simula o registro do progresso
        // Futuramente, isso será salvo no banco de dados
        const progressLog = {
            id: Date.now(),
            user_id: req.user.userId,
            workout_id: workout_id,
            date: new Date().toISOString(),
            exercises: exercises,
            duration: duration || null,
            notes: notes || '',
            body_weight: body_weight || null,
            energy_level: energy_level || null, // 1-10
            difficulty_rating: difficulty_rating || null, // 1-10
            created_at: new Date().toISOString()
        };

        res.status(201).json({
            message: 'Progresso registrado com sucesso',
            progress_log: progressLog
        });

    } catch (error) {
        console.error('Erro ao registrar progresso:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * GET /api/progress/history
 * Obter histórico de progresso
 */
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const { 
            exercise_name, 
            limit = 20, 
            offset = 0,
            start_date,
            end_date 
        } = req.query;

        // Por enquanto, retorna dados mockados
        // Futuramente, isso será integrado com o banco de dados
        const mockHistory = [
            {
                id: 1,
                date: '2024-01-29',
                workout_name: 'Treino de Peito',
                exercise: 'Supino Reto',
                sets: [
                    { reps: 12, weight: 80, completed: true },
                    { reps: 10, weight: 85, completed: true },
                    { reps: 8, weight: 85, completed: true },
                    { reps: 6, weight: 90, completed: false }
                ],
                notes: 'Última série foi difícil, mas progresso visível'
            },
            {
                id: 2,
                date: '2024-01-26',
                workout_name: 'Treino de Peito',
                exercise: 'Supino Reto',
                sets: [
                    { reps: 12, weight: 80, completed: true },
                    { reps: 10, weight: 80, completed: true },
                    { reps: 8, weight: 85, completed: true },
                    { reps: 6, weight: 85, completed: true }
                ],
                notes: 'Bom treino, consegui aumentar o peso'
            }
        ];

        // Filtrar por exercício se especificado
        let filteredHistory = mockHistory;
        if (exercise_name) {
            filteredHistory = mockHistory.filter(entry => 
                entry.exercise.toLowerCase().includes(exercise_name.toLowerCase())
            );
        }

        res.json({
            history: filteredHistory,
            total: filteredHistory.length,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (error) {
        console.error('Erro ao obter histórico:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * GET /api/progress/stats
 * Obter estatísticas detalhadas
 */
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const { period = '30d' } = req.query;

        // Por enquanto, retorna estatísticas mockadas
        // Futuramente, isso será calculado com base nos dados reais
        const mockStats = {
            user_id: req.user.userId,
            period: period,
            workout_stats: {
                total_workouts: 24,
                average_duration: 58,
                longest_workout: 85,
                shortest_workout: 35,
                most_frequent_day: 'Wednesday',
                consistency_percentage: 85
            },
            strength_stats: {
                total_weight_lifted: 12450,
                average_weight_per_workout: 518,
                strongest_exercise: 'Levantamento Terra',
                most_improved_exercise: 'Supino Reto',
                total_reps: 1560,
                total_sets: 468
            },
            body_composition: {
                weight_change: -0.9,
                weight_trend: 'decreasing',
                estimated_muscle_gain: 0.3,
                estimated_fat_loss: 1.2
            },
            achievements: [
                { name: 'Primeira semana completa', date: '2024-01-07', type: 'consistency' },
                { name: 'Supino 85kg alcançado', date: '2024-01-15', type: 'strength' },
                { name: '20 treinos completados', date: '2024-01-25', type: 'milestone' }
            ]
        };

        res.json({
            stats: mockStats
        });

    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

module.exports = router;

/**
 * Função auxiliar para gerar análise mockada personalizada
 */
function generateMockAnalysis(period, metrics, user_data) {
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
    const goal = user_data?.goal || 'Condicionamento geral';
    
    const analysisTemplates = {
        'Ganho de massa': {
            insights: [
                {
                    category: 'Força',
                    message: `Progresso sólido na força em ${periodDays} dias. Aumento médio de 12% nos exercícios principais.`,
                    priority: 'high',
                    recommendation: 'Continue com a progressão gradual de carga. Foque na técnica perfeita.'
                },
                {
                    category: 'Volume',
                    message: `Volume de treino adequado para hipertrofia. ${metrics.workouts_completed || 12} treinos completados.`,
                    priority: 'medium',
                    recommendation: 'Mantenha a consistência e considere aumentar o volume gradualmente.'
                },
                {
                    category: 'Recuperação',
                    message: 'Tempo de descanso entre séries está adequado para ganho de massa.',
                    priority: 'medium',
                    recommendation: 'Continue priorizando o sono (7-9h) e nutrição adequada.'
                }
            ],
            overall_score: 8.2,
            next_goals: [
                'Aumentar carga em 5% nos exercícios principais',
                'Manter consistência de 90%+ nos treinos',
                'Focar na conexão mente-músculo'
            ]
        },
        'Perda de peso': {
            insights: [
                {
                    category: 'Cardio',
                    message: `Excelente consistência no cardio. ${metrics.workouts_completed || 15} sessões em ${periodDays} dias.`,
                    priority: 'high',
                    recommendation: 'Continue variando a intensidade entre HIIT e cardio moderado.'
                },
                {
                    category: 'Composição Corporal',
                    message: 'Progresso consistente na perda de gordura mantendo massa muscular.',
                    priority: 'high',
                    recommendation: 'Mantenha o déficit calórico moderado e monitore a ingestão de proteínas.'
                },
                {
                    category: 'Energia',
                    message: 'Níveis de energia estão bons durante os treinos.',
                    priority: 'medium',
                    recommendation: 'Continue com refeições pré-treino adequadas.'
                }
            ],
            overall_score: 8.7,
            next_goals: [
                'Manter déficit calórico sustentável',
                'Incluir mais exercícios de força',
                'Atingir meta de passos diários'
            ]
        },
        'Condicionamento': {
            insights: [
                {
                    category: 'Resistência',
                    message: `Melhora significativa na resistência cardiovascular em ${periodDays} dias.`,
                    priority: 'high',
                    recommendation: 'Continue variando os tipos de exercício para desenvolvimento completo.'
                },
                {
                    category: 'Funcionalidade',
                    message: 'Exercícios funcionais estão melhorando a coordenação e equilíbrio.',
                    priority: 'medium',
                    recommendation: 'Inclua mais movimentos multiarticulares nos treinos.'
                },
                {
                    category: 'Flexibilidade',
                    message: 'Mobilidade e flexibilidade precisam de mais atenção.',
                    priority: 'medium',
                    recommendation: 'Dedique 10-15 minutos ao alongamento após cada treino.'
                }
            ],
            overall_score: 7.8,
            next_goals: [
                'Melhorar tempo em exercícios de resistência',
                'Incluir mais trabalho de mobilidade',
                'Aumentar frequência de treinos funcionais'
            ]
        }
    };

    const template = analysisTemplates[goal] || analysisTemplates['Condicionamento'];
    
    return {
        user_id: user_data?.userId || 'user_123',
        analysis_date: new Date().toISOString(),
        period: period,
        goal: goal,
        metrics_analyzed: metrics,
        insights: template.insights,
        overall_score: template.overall_score,
        next_goals: template.next_goals,
        recommendations: {
            immediate: 'Continue com o plano atual, está funcionando bem.',
            short_term: 'Considere pequenos ajustes na intensidade.',
            long_term: 'Reavalie objetivos em 3 meses.'
        },
        progress_summary: {
            workouts_completed: metrics.workouts_completed || Math.floor(periodDays / 3),
            consistency_rate: Math.min(95, 70 + Math.random() * 25),
            improvement_areas: ['Técnica', 'Consistência', 'Recuperação'],
            strengths: ['Dedicação', 'Progressão', 'Foco']
        }
    };
}