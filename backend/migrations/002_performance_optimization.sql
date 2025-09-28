-- EvolveFit Performance Optimization Migration
-- Advanced indexing and database optimizations

-- Índices compostos para queries frequentes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workouts_user_type_difficulty 
ON workouts(user_id, workout_type, difficulty_level);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workout_sessions_user_completed 
ON workout_sessions(user_id, completed_at) WHERE completed_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_progress_entries_user_date_desc 
ON progress_entries(user_id, entry_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nutrition_entries_user_date_meal 
ON nutrition_entries(user_id, entry_date, meal_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_interactions_user_type_success 
ON ai_interactions(user_id, interaction_type, success, created_at DESC);

-- Índices para campos JSONB frequentemente consultados
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workouts_exercises_gin 
ON workouts USING gin(exercises);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_preferences_gin 
ON users USING gin(preferences);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_progress_measurements_gin 
ON progress_entries USING gin(measurements);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nutrition_foods_gin 
ON nutrition_entries USING gin(foods);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nutrition_macros_gin 
ON nutrition_entries USING gin(macros);

-- Índices para arrays
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_goals_gin 
ON users USING gin(goals);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_progress_photos_gin 
ON progress_entries USING gin(photos);

-- Índices parciais para dados ativos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_recent 
ON users(created_at DESC) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workouts_ai_generated 
ON workouts(created_at DESC) WHERE ai_generated = true;

-- Índices para otimizar vector search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workouts_embedding_ivfflat_l2 
ON workouts USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- Otimizar configurações do pgvector
-- Aumentar work_mem temporariamente para criação de índices
SET maintenance_work_mem = '1GB';

-- Configurações para melhor performance do pgvector
ALTER SYSTEM SET shared_preload_libraries = 'vector';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET random_page_cost = 1.1;

-- Estatísticas estendidas para melhor planejamento de queries
CREATE STATISTICS IF NOT EXISTS stats_workouts_user_type 
ON user_id, workout_type FROM workouts;

CREATE STATISTICS IF NOT EXISTS stats_workout_sessions_user_date 
ON user_id, started_at FROM workout_sessions;

CREATE STATISTICS IF NOT EXISTS stats_progress_user_date 
ON user_id, entry_date FROM progress_entries;

-- Views materializadas para queries complexas frequentes
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_workout_stats AS
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.fitness_level,
    COUNT(DISTINCT w.id) as total_workouts_created,
    COUNT(DISTINCT ws.id) as total_sessions_completed,
    AVG(ws.duration_minutes) as avg_workout_duration,
    MAX(ws.completed_at) as last_workout_date,
    COUNT(DISTINCT DATE(ws.completed_at)) as workout_days_count,
    AVG(ws.rating) as avg_workout_rating
FROM users u
LEFT JOIN workouts w ON u.id = w.user_id
LEFT JOIN workout_sessions ws ON u.id = ws.user_id AND ws.completed_at IS NOT NULL
WHERE u.is_active = true
GROUP BY u.id, u.first_name, u.last_name, u.fitness_level;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_workout_stats_user_id 
ON mv_user_workout_stats(user_id);

-- View materializada para estatísticas de exercícios populares
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_exercises AS
WITH exercise_stats AS (
    SELECT 
        jsonb_array_elements(w.exercises)->>'name' as exercise_name,
        jsonb_array_elements(w.exercises)->>'muscle_group' as muscle_group,
        w.workout_type,
        w.difficulty_level,
        COUNT(*) as workout_count,
        COUNT(DISTINCT w.user_id) as unique_users,
        COUNT(DISTINCT ws.id) as completion_count,
        AVG((jsonb_array_elements(w.exercises)->>'sets')::int) as avg_sets,
        AVG((jsonb_array_elements(w.exercises)->>'reps')::int) as avg_reps
    FROM workouts w
    LEFT JOIN workout_sessions ws ON w.id = ws.workout_id AND ws.completed_at IS NOT NULL
    WHERE jsonb_array_elements(w.exercises)->>'name' IS NOT NULL
    GROUP BY exercise_name, muscle_group, w.workout_type, w.difficulty_level
)
SELECT 
    exercise_name,
    muscle_group,
    workout_type,
    difficulty_level,
    workout_count,
    unique_users,
    completion_count,
    ROUND(avg_sets, 1) as avg_sets,
    ROUND(avg_reps, 1) as avg_reps,
    ROUND((completion_count::float / NULLIF(workout_count, 0)) * 100, 2) as completion_rate
FROM exercise_stats
WHERE workout_count >= 2
ORDER BY completion_count DESC, workout_count DESC;

CREATE INDEX IF NOT EXISTS idx_mv_popular_exercises_name 
ON mv_popular_exercises(exercise_name);

CREATE INDEX IF NOT EXISTS idx_mv_popular_exercises_muscle_group 
ON mv_popular_exercises(muscle_group);

-- Função para refresh automático das views materializadas
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_workout_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_exercises;
    
    -- Log da atualização
    INSERT INTO ai_interactions (
        user_id, 
        interaction_type, 
        input_data, 
        llm_response, 
        success
    ) VALUES (
        (SELECT id FROM users WHERE email = 'demo@evolvefit.com' LIMIT 1),
        'system_maintenance',
        '{"action": "refresh_materialized_views"}',
        '{"refreshed_at": "' || NOW() || '"}',
        true
    );
END;
$$ LANGUAGE plpgsql;

-- Configurar refresh automático (executar manualmente quando necessário)
-- SELECT cron.schedule('refresh-mv', '0 2 * * *', 'SELECT refresh_materialized_views();');

-- Função para análise de performance de queries
CREATE OR REPLACE FUNCTION analyze_query_performance()
RETURNS TABLE(
    query_type text,
    avg_duration_ms numeric,
    total_calls bigint,
    recommendation text
) AS $$
BEGIN
    -- Esta função seria implementada com pg_stat_statements em produção
    RETURN QUERY
    SELECT 
        'vector_search'::text,
        50.5::numeric,
        100::bigint,
        'Considere ajustar o threshold de similaridade'::text
    UNION ALL
    SELECT 
        'workout_recommendations'::text,
        25.2::numeric,
        250::bigint,
        'Performance adequada'::text;
END;
$$ LANGUAGE plpgsql;

-- Configurações de autovacuum otimizadas para tabelas específicas
ALTER TABLE workouts SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE workout_sessions SET (
    autovacuum_vacuum_scale_factor = 0.2,
    autovacuum_analyze_scale_factor = 0.1
);

ALTER TABLE ai_interactions SET (
    autovacuum_vacuum_scale_factor = 0.3,
    autovacuum_analyze_scale_factor = 0.1
);

-- Particionamento por data para tabelas de log (preparação futura)
-- CREATE TABLE ai_interactions_y2024m01 PARTITION OF ai_interactions
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Função para limpeza automática de dados antigos
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Limpar interações AI antigas (mais de 6 meses)
    DELETE FROM ai_interactions 
    WHERE created_at < NOW() - INTERVAL '6 months'
    AND success = false;
    
    -- Limpar sessões de workout incompletas antigas (mais de 30 dias)
    DELETE FROM workout_sessions 
    WHERE completed_at IS NULL 
    AND started_at < NOW() - INTERVAL '30 days';
    
    -- Log da limpeza
    INSERT INTO ai_interactions (
        user_id, 
        interaction_type, 
        input_data, 
        success
    ) VALUES (
        (SELECT id FROM users WHERE email = 'demo@evolvefit.com' LIMIT 1),
        'system_cleanup',
        '{"cleaned_at": "' || NOW() || '"}',
        true
    );
END;
$$ LANGUAGE plpgsql;

-- Atualizar estatísticas das tabelas
ANALYZE users;
ANALYZE workouts;
ANALYZE workout_sessions;
ANALYZE progress_entries;
ANALYZE nutrition_entries;
ANALYZE ai_interactions;

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Performance optimization migration completed successfully!';
    RAISE NOTICE 'Created % indexes for better query performance', 
        (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%');
    RAISE NOTICE 'Created % materialized views for complex queries', 
        (SELECT count(*) FROM pg_matviews WHERE schemaname = 'public');
END $$;