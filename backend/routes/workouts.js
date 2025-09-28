const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const vectorSearch = require('../services/vectorSearch');

const router = express.Router();

/**
 * GET /api/workouts
 * Obter workouts do usuário
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Por enquanto, retorna dados mockados
        // Futuramente, isso será integrado com o banco de dados
        const mockWorkouts = [
            {
                id: 1,
                name: 'Treino de Peito e Tríceps',
                date: '2024-01-15',
                duration: 60,
                exercises: [
                    { name: 'Supino Reto', sets: 4, reps: 12, weight: 80 },
                    { name: 'Supino Inclinado', sets: 3, reps: 10, weight: 70 },
                    { name: 'Tríceps Pulley', sets: 3, reps: 15, weight: 40 }
                ],
                completed: true
            },
            {
                id: 2,
                name: 'Treino de Costas e Bíceps',
                date: '2024-01-17',
                duration: 65,
                exercises: [
                    { name: 'Puxada Frontal', sets: 4, reps: 12, weight: 60 },
                    { name: 'Remada Curvada', sets: 3, reps: 10, weight: 70 },
                    { name: 'Rosca Direta', sets: 3, reps: 12, weight: 30 }
                ],
                completed: false
            }
        ];

        res.json({
            workouts: mockWorkouts,
            total: mockWorkouts.length
        });

    } catch (error) {
        console.error('Erro ao obter workouts:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * POST /api/workouts/generate
 * Gerar workout com LLM via n8n webhook
 */
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const { goals, experience, equipment, duration, user_data } = req.body;

        // Validações básicas
        if (!goals || !experience) {
            return res.status(400).json({
                error: 'Objetivos e nível de experiência são obrigatórios'
            });
        }

        // Preparar dados para cache e webhook
        const cacheData = {
            userId: req.user.userId,
            goal: goals,
            experience: experience,
            equipment: equipment || 'Academia completa',
            duration: duration || 60
        };

        // Verificar cache primeiro
        const cachedWorkout = req.cache.get('workoutGeneration', cacheData);
        if (cachedWorkout) {
            return res.status(201).json({
                message: 'Workout gerado com sucesso (cache)',
                workout: cachedWorkout,
                source: 'cache'
            });
        }

        // Preparar dados para o webhook n8n
        const webhookData = {
            action: 'workoutGeneration',
            studentData: {
                userId: req.user.userId,
                name: user_data?.name || 'Usuário',
                age: user_data?.age || 25,
                weight: user_data?.weight || 70,
                height: user_data?.height || 170,
                goal: goals,
                experience: experience,
                equipment: equipment || 'Academia completa',
                duration: duration || 60,
                injuries: user_data?.injuries || 'Nenhuma',
                training: {
                    location: user_data?.training?.location || 'Academia',
                    modality: user_data?.training?.modality || 'Musculação'
                },
                benchmark: user_data?.benchmark || {
                    squat: 60,
                    bench: 50,
                    deadlift: 80,
                    pullups: 5,
                    pushups: 15
                }
            }
        };

        try {
            // Chamar webhook n8n para geração LLM
            const axios = require('axios');
            const webhookUrl = process.env.N8N_LLM_WEBHOOK || 'https://n8n.leplustudio.top/webhook/evolvefit-llm';
            const webhookResponse = await axios.post(webhookUrl, webhookData, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (webhookResponse.data && webhookResponse.data.success) {
                // Armazenar no cache (TTL: 2 horas para workouts)
                req.cache.set('workoutGeneration', cacheData, webhookResponse.data.data, 2 * 60 * 60 * 1000);
                
                res.status(201).json({
                    message: 'Workout gerado com sucesso via LLM',
                    workout: webhookResponse.data.data,
                    source: 'llm'
                });
            } else {
                throw new Error('Resposta inválida do webhook');
            }

        } catch (webhookError) {
            console.error('Erro no webhook n8n:', webhookError.message);
            
            // Fallback: workout mockado personalizado
            const generatedWorkout = {
                id: Date.now(),
                name: `Treino Personalizado - ${goals}`,
                date: new Date().toISOString().split('T')[0],
                duration: duration || 60,
                experience_level: experience,
                goal: goals,
                exercises: generateMockExercises(goals, experience, equipment),
                completed: false,
                generated: true,
                parameters: { goals, experience, equipment, duration },
                notes: `Treino gerado para ${experience} focado em ${goals}`,
                warm_up: [
                    { name: 'Caminhada na esteira', duration: '5 min', intensity: 'leve' },
                    { name: 'Alongamento dinâmico', duration: '5 min', focus: 'mobilidade' }
                ],
                cool_down: [
                    { name: 'Alongamento estático', duration: '10 min', focus: 'relaxamento' },
                    { name: 'Respiração profunda', duration: '2 min', technique: 'diafragmática' }
                ]
            };

            // Armazenar fallback no cache (TTL menor: 30 minutos)
            req.cache.set('workoutGeneration', cacheData, generatedWorkout, 30 * 60 * 1000);

            res.status(201).json({
                message: 'Workout gerado com sucesso (versão mockada)',
                workout: generatedWorkout,
                source: 'fallback',
                note: 'Integração com LLM temporariamente indisponível'
            });
        }

    } catch (error) {
        console.error('Erro ao gerar workout:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * GET /api/workouts/:id
 * Obter workout específico
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Por enquanto, retorna dados mockados
        // Futuramente, isso será integrado com o banco de dados
        const mockWorkout = {
            id: parseInt(id),
            name: 'Treino de Peito e Tríceps',
            date: '2024-01-15',
            duration: 60,
            exercises: [
                { 
                    name: 'Supino Reto', 
                    sets: 4, 
                    reps: 12, 
                    weight: 80,
                    instructions: 'Mantenha os pés firmes no chão e controle o movimento'
                },
                { 
                    name: 'Supino Inclinado', 
                    sets: 3, 
                    reps: 10, 
                    weight: 70,
                    instructions: 'Inclinação de 30-45 graus, foque na parte superior do peitoral'
                },
                { 
                    name: 'Tríceps Pulley', 
                    sets: 3, 
                    reps: 15, 
                    weight: 40,
                    instructions: 'Mantenha os cotovelos fixos, movimento apenas do antebraço'
                }
            ],
            completed: false,
            notes: 'Treino focado em hipertrofia',
            created_at: '2024-01-15T10:00:00Z'
        };

        if (!mockWorkout) {
            return res.status(404).json({
                error: 'Workout não encontrado'
            });
        }

        res.json({
            workout: mockWorkout
        });

    } catch (error) {
        console.error('Erro ao obter workout:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * POST /api/workouts/:id/complete
 * Marcar workout como concluído
 */
router.post('/:id/complete', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { exercises_completed, notes, duration_actual } = req.body;

        // Por enquanto, simula a conclusão do workout
        // Futuramente, isso será salvo no banco de dados
        const completedWorkout = {
            id: parseInt(id),
            completed: true,
            completed_at: new Date().toISOString(),
            exercises_completed: exercises_completed || [],
            notes: notes || '',
            duration_actual: duration_actual || null,
            user_id: req.user.userId
        };

        res.json({
            message: 'Workout marcado como concluído',
            workout: completedWorkout
        });

    } catch (error) {
        console.error('Erro ao completar workout:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * PUT /api/workouts/:id
 * Atualizar workout
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, exercises, notes } = req.body;

        // Validações básicas
        if (!name || !exercises || !Array.isArray(exercises)) {
            return res.status(400).json({
                error: 'Nome e exercícios são obrigatórios'
            });
        }

        // Por enquanto, simula a atualização
        // Futuramente, isso será salvo no banco de dados
        const updatedWorkout = {
            id: parseInt(id),
            name,
            exercises,
            notes: notes || '',
            updated_at: new Date().toISOString(),
            user_id: req.user.userId
        };

        res.json({
            message: 'Workout atualizado com sucesso',
            workout: updatedWorkout
        });

    } catch (error) {
        console.error('Erro ao atualizar workout:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * DELETE /api/workouts/:id
 * Deletar workout
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Por enquanto, simula a deleção
        // Futuramente, isso será implementado no banco de dados
        res.json({
            message: 'Workout deletado com sucesso',
            deleted_id: parseInt(id)
        });

    } catch (error) {
        console.error('Erro ao deletar workout:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

module.exports = router;

/**
 * Função auxiliar para gerar exercícios mockados personalizados
 */
function generateMockExercises(goals, experience, equipment) {
    const exerciseDatabase = {
        'Ganho de massa': {
            iniciante: [
                { name: 'Agachamento livre', sets: 3, reps: 12, weight: '40kg', muscle_group: 'Pernas' },
                { name: 'Supino reto', sets: 3, reps: 10, weight: '30kg', muscle_group: 'Peito' },
                { name: 'Remada curvada', sets: 3, reps: 12, weight: '25kg', muscle_group: 'Costas' },
                { name: 'Desenvolvimento militar', sets: 3, reps: 10, weight: '20kg', muscle_group: 'Ombros' }
            ],
            intermediario: [
                { name: 'Agachamento livre', sets: 4, reps: 10, weight: '60kg', muscle_group: 'Pernas' },
                { name: 'Supino reto', sets: 4, reps: 8, weight: '50kg', muscle_group: 'Peito' },
                { name: 'Levantamento terra', sets: 4, reps: 6, weight: '80kg', muscle_group: 'Costas' },
                { name: 'Desenvolvimento militar', sets: 4, reps: 8, weight: '35kg', muscle_group: 'Ombros' },
                { name: 'Rosca direta', sets: 3, reps: 12, weight: '15kg', muscle_group: 'Bíceps' }
            ],
            avancado: [
                { name: 'Agachamento livre', sets: 5, reps: 6, weight: '100kg', muscle_group: 'Pernas' },
                { name: 'Supino reto', sets: 5, reps: 5, weight: '80kg', muscle_group: 'Peito' },
                { name: 'Levantamento terra', sets: 5, reps: 5, weight: '120kg', muscle_group: 'Costas' },
                { name: 'Desenvolvimento militar', sets: 4, reps: 6, weight: '50kg', muscle_group: 'Ombros' },
                { name: 'Barra fixa', sets: 4, reps: 8, weight: 'Peso corporal', muscle_group: 'Costas' }
            ]
        },
        'Perda de peso': {
            iniciante: [
                { name: 'Caminhada na esteira', sets: 1, reps: '20 min', weight: null, muscle_group: 'Cardio' },
                { name: 'Agachamento com peso corporal', sets: 3, reps: 15, weight: 'Peso corporal', muscle_group: 'Pernas' },
                { name: 'Flexão de braço', sets: 3, reps: 10, weight: 'Peso corporal', muscle_group: 'Peito' },
                { name: 'Prancha', sets: 3, reps: '30s', weight: 'Peso corporal', muscle_group: 'Core' }
            ],
            intermediario: [
                { name: 'HIIT na esteira', sets: 1, reps: '15 min', weight: null, muscle_group: 'Cardio' },
                { name: 'Burpees', sets: 4, reps: 12, weight: 'Peso corporal', muscle_group: 'Full body' },
                { name: 'Mountain climbers', sets: 4, reps: 20, weight: 'Peso corporal', muscle_group: 'Core' },
                { name: 'Jump squats', sets: 4, reps: 15, weight: 'Peso corporal', muscle_group: 'Pernas' }
            ],
            avancado: [
                { name: 'HIIT avançado', sets: 1, reps: '25 min', weight: null, muscle_group: 'Cardio' },
                { name: 'Thruster', sets: 5, reps: 12, weight: '20kg', muscle_group: 'Full body' },
                { name: 'Box jumps', sets: 4, reps: 10, weight: 'Peso corporal', muscle_group: 'Pernas' },
                { name: 'Kettlebell swings', sets: 4, reps: 20, weight: '16kg', muscle_group: 'Full body' }
            ]
        },
        'Condicionamento': {
            iniciante: [
                { name: 'Corrida leve', sets: 1, reps: '15 min', weight: null, muscle_group: 'Cardio' },
                { name: 'Agachamento', sets: 3, reps: 12, weight: 'Peso corporal', muscle_group: 'Pernas' },
                { name: 'Flexão modificada', sets: 3, reps: 8, weight: 'Peso corporal', muscle_group: 'Peito' },
                { name: 'Prancha', sets: 3, reps: '20s', weight: 'Peso corporal', muscle_group: 'Core' }
            ],
            intermediario: [
                { name: 'Corrida intervalada', sets: 1, reps: '20 min', weight: null, muscle_group: 'Cardio' },
                { name: 'Agachamento com salto', sets: 4, reps: 10, weight: 'Peso corporal', muscle_group: 'Pernas' },
                { name: 'Flexão de braço', sets: 4, reps: 12, weight: 'Peso corporal', muscle_group: 'Peito' },
                { name: 'Russian twists', sets: 4, reps: 20, weight: 'Peso corporal', muscle_group: 'Core' }
            ],
            avancado: [
                { name: 'Corrida de alta intensidade', sets: 1, reps: '30 min', weight: null, muscle_group: 'Cardio' },
                { name: 'Pistol squats', sets: 4, reps: 6, weight: 'Peso corporal', muscle_group: 'Pernas' },
                { name: 'Flexão archer', sets: 4, reps: 8, weight: 'Peso corporal', muscle_group: 'Peito' },
                { name: 'L-sit', sets: 4, reps: '15s', weight: 'Peso corporal', muscle_group: 'Core' }
            ]
        }
    };

    const goalKey = goals || 'Condicionamento';
    const expKey = experience || 'iniciante';
    
    return exerciseDatabase[goalKey]?.[expKey] || exerciseDatabase['Condicionamento']['iniciante'];
}

/**
 * GET /api/workouts/search
 * Buscar workouts usando vector search
 */
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const { 
            query, 
            limit = 10, 
            threshold = 0.7,
            user_only = false 
        } = req.query;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                error: 'Query de busca é obrigatória'
            });
        }

        const userId = user_only === 'true' ? req.user.userId : null;
        const searchLimit = Math.min(parseInt(limit), 50); // Máximo 50 resultados
        const similarityThreshold = Math.max(0.1, Math.min(parseFloat(threshold), 1.0)); // Entre 0.1 e 1.0

        const results = await vectorSearch.searchSimilarWorkouts(
            query, 
            userId, 
            searchLimit, 
            similarityThreshold
        );

        res.json({
            query: query,
            results: results,
            total: results.length,
            threshold: similarityThreshold
        });

    } catch (error) {
        console.error('Erro na busca de workouts:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * POST /api/workouts/search/features
 * Buscar workouts por características específicas
 */
router.post('/search/features', authenticateToken, async (req, res) => {
    try {
        const features = req.body;

        if (!features || Object.keys(features).length === 0) {
            return res.status(400).json({
                error: 'Características de busca são obrigatórias'
            });
        }

        const results = await vectorSearch.searchExercisesByFeatures(features);

        res.json({
            features: features,
            results: results,
            total: results.length
        });

    } catch (error) {
        console.error('Erro na busca por características:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * GET /api/workouts/recommendations
 * Obter recomendações personalizadas de workouts
 */
router.get('/recommendations', authenticateToken, async (req, res) => {
    try {
        const { limit = 5 } = req.query;
        const userId = req.user.userId;
        const recommendationLimit = Math.min(parseInt(limit), 20); // Máximo 20 recomendações

        const recommendations = await vectorSearch.recommendWorkouts(userId, recommendationLimit);

        res.json({
            user_id: userId,
            recommendations: recommendations,
            total: recommendations.length,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Erro ao gerar recomendações:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * POST /api/workouts/save-with-embedding
 * Salvar workout com embedding para vector search
 */
router.post('/save-with-embedding', authenticateToken, async (req, res) => {
    try {
        const workoutData = {
            ...req.body,
            user_id: req.user.userId
        };

        // Validações básicas
        if (!workoutData.title || !workoutData.exercises) {
            return res.status(400).json({
                error: 'Título e exercícios são obrigatórios'
            });
        }

        const result = await vectorSearch.saveWorkoutWithEmbedding(workoutData);

        res.status(201).json({
            message: 'Workout salvo com embedding gerado',
            workout: result
        });

    } catch (error) {
        console.error('Erro ao salvar workout com embedding:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * POST /api/workouts/update-embeddings
 * Atualizar embeddings de workouts existentes (admin only)
 */
router.post('/update-embeddings', authenticateToken, async (req, res) => {
    try {
        // Em um ambiente real, você adicionaria verificação de admin aqui
        const updatedCount = await vectorSearch.updateExistingEmbeddings();

        res.json({
            message: 'Embeddings atualizados com sucesso',
            updated_count: updatedCount
        });

    } catch (error) {
        console.error('Erro ao atualizar embeddings:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});