const { pool } = require('../config/database');
const axios = require('axios');

class VectorSearchService {
    constructor() {
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.embeddingModel = 'text-embedding-3-small';
        this.embeddingDimension = 1536;
        console.log('⚠️ Vector search service initialized without pgvector (compatibility mode)');
    }

    /**
     * Gerar embedding usando OpenAI (mockado para compatibilidade)
     */
    async generateEmbedding(text) {
        console.log('⚠️ Using mock embedding for compatibility');
        // Retorna um vetor mockado para desenvolvimento/compatibilidade
        return Array(this.embeddingDimension).fill(0).map(() => Math.random() * 2 - 1);
    }

    /**
     * Criar texto descritivo do workout para embedding
     */
    createWorkoutDescription(workout) {
        const parts = [
            workout.title || '',
            workout.description || '',
            workout.workout_type || '',
            workout.difficulty_level || '',
            `duração ${workout.estimated_duration || 0} minutos`
        ];

        // Adicionar descrição dos exercícios
        if (workout.exercises && Array.isArray(workout.exercises)) {
            const exerciseDescriptions = workout.exercises.map(ex => {
                return `${ex.name || ''} ${ex.muscle_groups ? ex.muscle_groups.join(' ') : ''} ${ex.equipment || ''}`;
            }).join(' ');
            parts.push(exerciseDescriptions);
        }

        return parts.filter(p => p.trim()).join(' ').toLowerCase();
    }

    /**
     * Salvar workout sem embedding (compatibilidade)
     */
    async saveWorkoutWithEmbedding(workoutData) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // Inserir workout sem embedding para compatibilidade
            const insertQuery = `
                INSERT INTO workouts (
                    user_id, title, description, workout_type, difficulty_level,
                    estimated_duration, exercises, ai_generated, llm_prompt, 
                    llm_response
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id, created_at
            `;

            const values = [
                workoutData.user_id,
                workoutData.title,
                workoutData.description,
                workoutData.workout_type,
                workoutData.difficulty_level,
                workoutData.estimated_duration,
                JSON.stringify(workoutData.exercises || []),
                workoutData.ai_generated || false,
                workoutData.llm_prompt || null,
                workoutData.llm_response ? JSON.stringify(workoutData.llm_response) : null
            ];

            const result = await client.query(insertQuery, values);
            await client.query('COMMIT');

            return {
                id: result.rows[0].id,
                created_at: result.rows[0].created_at,
                embedding_generated: false
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erro ao salvar workout:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar workouts similares usando busca por texto (fallback)
     */
    async searchSimilarWorkouts(query, userId = null, limit = 10, threshold = 0.7) {
        try {
            console.log('⚠️ Using text-based search instead of vector search');
            
            // Busca por texto simples como fallback
            let sqlQuery = `
                SELECT 
                    id,
                    title,
                    description,
                    workout_type,
                    difficulty_level,
                    estimated_duration,
                    exercises,
                    ai_generated,
                    created_at,
                    0.5 as similarity_score
                FROM workouts
                WHERE (
                    LOWER(title) LIKE LOWER($1) OR 
                    LOWER(description) LIKE LOWER($1) OR
                    LOWER(workout_type) LIKE LOWER($1)
                )
            `;

            const params = [`%${query}%`];
            let paramIndex = 2;

            // Filtrar por usuário se especificado
            if (userId) {
                sqlQuery += ` AND user_id = $${paramIndex}`;
                params.push(userId);
                paramIndex++;
            }

            sqlQuery += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
            params.push(limit);

            const result = await pool.query(sqlQuery, params);

            return result.rows.map(row => ({
                ...row,
                exercises: typeof row.exercises === 'string' ? JSON.parse(row.exercises) : row.exercises,
                similarity_score: parseFloat(row.similarity_score)
            }));

        } catch (error) {
            console.error('Erro na busca de workouts similares:', error);
            return [];
        }
    }

    /**
     * Buscar workouts por filtros
     */
    async searchWorkoutsByFilters(filters = {}, userId = null, limit = 20) {
        try {
            let sqlQuery = `
                SELECT 
                    id, title, description, workout_type, difficulty_level,
                    estimated_duration, exercises, ai_generated, created_at
                FROM workouts
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            // Filtros
            if (filters.workout_type) {
                sqlQuery += ` AND workout_type = $${paramIndex}`;
                params.push(filters.workout_type);
                paramIndex++;
            }

            if (filters.difficulty_level) {
                sqlQuery += ` AND difficulty_level = $${paramIndex}`;
                params.push(filters.difficulty_level);
                paramIndex++;
            }

            if (filters.max_duration) {
                sqlQuery += ` AND estimated_duration <= $${paramIndex}`;
                params.push(filters.max_duration);
                paramIndex++;
            }

            if (userId) {
                sqlQuery += ` AND user_id = $${paramIndex}`;
                params.push(userId);
                paramIndex++;
            }

            sqlQuery += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
            params.push(limit);

            const result = await pool.query(sqlQuery, params);

            return result.rows.map(row => ({
                ...row,
                exercises: typeof row.exercises === 'string' ? JSON.parse(row.exercises) : row.exercises
            }));

        } catch (error) {
            console.error('Erro na busca por filtros:', error);
            return [];
        }
    }

    /**
     * Recomendar workouts baseado no histórico do usuário
     */
    async recommendWorkouts(userId, limit = 5) {
        try {
            // Buscar workouts populares como recomendação simples
            const sqlQuery = `
                SELECT 
                    w.id, w.title, w.description, w.workout_type, 
                    w.difficulty_level, w.estimated_duration, w.exercises,
                    COUNT(ws.id) as usage_count
                FROM workouts w
                LEFT JOIN workout_sessions ws ON w.id = ws.workout_id
                WHERE w.user_id != $1 OR w.user_id IS NULL
                GROUP BY w.id, w.title, w.description, w.workout_type, 
                         w.difficulty_level, w.estimated_duration, w.exercises
                ORDER BY usage_count DESC, w.created_at DESC
                LIMIT $2
            `;

            const result = await pool.query(sqlQuery, [userId, limit]);

            return result.rows.map(row => ({
                ...row,
                exercises: typeof row.exercises === 'string' ? JSON.parse(row.exercises) : row.exercises,
                recommendation_score: 0.8 - (Math.random() * 0.3) // Score mockado
            }));

        } catch (error) {
            console.error('Erro ao recomendar workouts:', error);
            return [];
        }
    }

    /**
     * Método placeholder para compatibilidade
     */
    async updateExistingEmbeddings() {
        console.log('⚠️ Embedding update skipped (compatibility mode)');
        return 0;
    }

    /**
     * Criar texto descritivo do workout para embedding
     */
    createWorkoutDescription(workout) {
        const parts = [
            workout.title || '',
            workout.description || '',
            workout.workout_type || '',
            workout.difficulty_level || '',
            `duração ${workout.estimated_duration || 0} minutos`
        ];

        // Adicionar descrição dos exercícios
        if (workout.exercises && Array.isArray(workout.exercises)) {
            const exerciseDescriptions = workout.exercises.map(ex => {
                return `${ex.name || ''} ${ex.muscle_groups ? ex.muscle_groups.join(' ') : ''} ${ex.equipment || ''}`;
            }).join(' ');
            parts.push(exerciseDescriptions);
        }

        return parts.filter(p => p.trim()).join(' ').toLowerCase();
    }

    /**
     * Salvar workout com embedding
     */
    async saveWorkoutWithEmbedding(workoutData) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // Gerar descrição e embedding
            const description = this.createWorkoutDescription(workoutData);
            const embedding = await this.generateEmbedding(description);

            // Inserir workout
            const insertQuery = `
                INSERT INTO workouts (
                    user_id, title, description, workout_type, difficulty_level,
                    estimated_duration, exercises, ai_generated, llm_prompt, 
                    llm_response, embedding
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id, created_at
            `;

            const values = [
                workoutData.user_id,
                workoutData.title,
                workoutData.description,
                workoutData.workout_type,
                workoutData.difficulty_level,
                workoutData.estimated_duration,
                JSON.stringify(workoutData.exercises || []),
                workoutData.ai_generated || false,
                workoutData.llm_prompt || null,
                workoutData.llm_response ? JSON.stringify(workoutData.llm_response) : null,
                `[${embedding.join(',')}]`
            ];

            const result = await client.query(insertQuery, values);
            await client.query('COMMIT');

            return {
                id: result.rows[0].id,
                created_at: result.rows[0].created_at,
                embedding_generated: true
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erro ao salvar workout com embedding:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar workouts similares usando vector search
     */
    async searchSimilarWorkouts(query, userId = null, limit = 10, threshold = 0.7) {
        try {
            // Gerar embedding da query
            const queryEmbedding = await this.generateEmbedding(query.toLowerCase());

            // Construir query SQL
            let sqlQuery = `
                SELECT 
                    id,
                    title,
                    description,
                    workout_type,
                    difficulty_level,
                    estimated_duration,
                    exercises,
                    ai_generated,
                    created_at,
                    1 - (embedding <=> $1) as similarity_score
                FROM workouts
                WHERE 1 - (embedding <=> $1) > $2
            `;

            const params = [`[${queryEmbedding.join(',')}]`, threshold];
            let paramIndex = 3;

            // Filtrar por usuário se especificado
            if (userId) {
                sqlQuery += ` AND user_id = $${paramIndex}`;
                params.push(userId);
                paramIndex++;
            }

            sqlQuery += ` ORDER BY similarity_score DESC LIMIT $${paramIndex}`;
            params.push(limit);

            const result = await pool.query(sqlQuery, params);

            return result.rows.map(row => ({
                ...row,
                exercises: typeof row.exercises === 'string' ? JSON.parse(row.exercises) : row.exercises,
                similarity_score: parseFloat(row.similarity_score.toFixed(4))
            }));

        } catch (error) {
            console.error('Erro na busca por similaridade:', error);
            return [];
        }
    }

    /**
     * Buscar exercícios por características específicas
     */
    async searchExercisesByFeatures(features) {
        const {
            muscle_groups = [],
            equipment = [],
            difficulty = null,
            workout_type = null,
            duration_range = null
        } = features;

        try {
            // Criar query baseada nas características
            const searchTerms = [
                ...muscle_groups,
                ...equipment,
                difficulty,
                workout_type
            ].filter(Boolean);

            const queryText = searchTerms.join(' ');
            
            if (!queryText.trim()) {
                return [];
            }

            let results = await this.searchSimilarWorkouts(queryText, null, 20, 0.5);

            // Filtrar por duração se especificado
            if (duration_range && duration_range.min && duration_range.max) {
                results = results.filter(workout => {
                    const duration = workout.estimated_duration || 0;
                    return duration >= duration_range.min && duration <= duration_range.max;
                });
            }

            return results;

        } catch (error) {
            console.error('Erro na busca por características:', error);
            return [];
        }
    }

    /**
     * Recomendar workouts baseado no histórico do usuário
     */
    async recommendWorkouts(userId, limit = 5) {
        try {
            // Buscar workouts recentes do usuário
            const recentWorkoutsQuery = `
                SELECT w.title, w.description, w.workout_type, w.exercises
                FROM workout_sessions ws
                JOIN workouts w ON ws.workout_id = w.id
                WHERE ws.user_id = $1 AND ws.completed_at IS NOT NULL
                ORDER BY ws.completed_at DESC
                LIMIT 5
            `;

            const recentWorkouts = await pool.query(recentWorkoutsQuery, [userId]);

            if (recentWorkouts.rows.length === 0) {
                // Se não há histórico, retornar workouts populares
                return await this.getPopularWorkouts(limit);
            }

            // Criar query baseada no histórico
            const workoutDescriptions = recentWorkouts.rows.map(w => 
                this.createWorkoutDescription(w)
            ).join(' ');

            // Buscar workouts similares (excluindo os já feitos)
            const completedWorkoutIds = await pool.query(`
                SELECT DISTINCT workout_id 
                FROM workout_sessions 
                WHERE user_id = $1 AND completed_at IS NOT NULL
            `, [userId]);

            const excludeIds = completedWorkoutIds.rows.map(row => row.workout_id);
            
            let recommendations = await this.searchSimilarWorkouts(workoutDescriptions, null, limit * 2, 0.6);
            
            // Filtrar workouts já completados
            recommendations = recommendations.filter(w => !excludeIds.includes(w.id));

            return recommendations.slice(0, limit);

        } catch (error) {
            console.error('Erro ao gerar recomendações:', error);
            return await this.getPopularWorkouts(limit);
        }
    }

    /**
     * Obter workouts populares como fallback
     */
    async getPopularWorkouts(limit = 5) {
        try {
            const query = `
                SELECT 
                    w.*,
                    COUNT(ws.id) as completion_count
                FROM workouts w
                LEFT JOIN workout_sessions ws ON w.id = ws.workout_id AND ws.completed_at IS NOT NULL
                GROUP BY w.id
                ORDER BY completion_count DESC, w.created_at DESC
                LIMIT $1
            `;

            const result = await pool.query(query, [limit]);
            
            return result.rows.map(row => ({
                ...row,
                exercises: typeof row.exercises === 'string' ? JSON.parse(row.exercises) : row.exercises,
                completion_count: parseInt(row.completion_count)
            }));

        } catch (error) {
            console.error('Erro ao buscar workouts populares:', error);
            return [];
        }
    }

    /**
     * Atualizar embeddings de workouts existentes
     */
    async updateExistingEmbeddings() {
        try {
            // Buscar workouts sem embedding
            const workoutsQuery = `
                SELECT id, title, description, workout_type, difficulty_level, 
                       estimated_duration, exercises
                FROM workouts 
                WHERE embedding IS NULL
                ORDER BY created_at DESC
            `;

            const result = await pool.query(workoutsQuery);
            const workouts = result.rows;

            console.log(`Atualizando embeddings para ${workouts.length} workouts...`);

            for (const workout of workouts) {
                try {
                    const description = this.createWorkoutDescription(workout);
                    const embedding = await this.generateEmbedding(description);

                    await pool.query(
                        'UPDATE workouts SET embedding = $1 WHERE id = $2',
                        [`[${embedding.join(',')}]`, workout.id]
                    );

                    console.log(`Embedding atualizado para workout ${workout.id}`);
                    
                    // Pequena pausa para evitar rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));

                } catch (error) {
                    console.error(`Erro ao atualizar embedding do workout ${workout.id}:`, error.message);
                }
            }

            console.log('Atualização de embeddings concluída!');
            return workouts.length;

        } catch (error) {
            console.error('Erro ao atualizar embeddings:', error);
            throw error;
        }
    }
}

module.exports = new VectorSearchService();