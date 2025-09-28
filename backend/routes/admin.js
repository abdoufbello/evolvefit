const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getRateLimitStats, resetUserRateLimit } = require('../middleware/rateLimiter');
const db = require('../config/database');

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Acesso negado. Privilégios de administrador necessários.'
        });
    }
    next();
};

// Aplicar autenticação em todas as rotas admin
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/stats - Estatísticas gerais do sistema
router.get('/stats', async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                'users' as table_name,
                COUNT(*) as total_records,
                COUNT(*) FILTER (WHERE is_active = true) as active_records,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent_records
            FROM users
            UNION ALL
            SELECT 
                'workouts' as table_name,
                COUNT(*) as total_records,
                COUNT(*) FILTER (WHERE ai_generated = true) as active_records,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent_records
            FROM workouts
            UNION ALL
            SELECT 
                'workout_sessions' as table_name,
                COUNT(*) as total_records,
                COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as active_records,
                COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '30 days') as recent_records
            FROM workout_sessions
            UNION ALL
            SELECT 
                'ai_interactions' as table_name,
                COUNT(*) as total_records,
                COUNT(*) FILTER (WHERE success = true) as active_records,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent_records
            FROM ai_interactions
        `);

        const performanceStats = await db.query(`
            SELECT 
                schemaname,
                tablename,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes,
                n_live_tup as live_tuples,
                n_dead_tup as dead_tuples,
                last_vacuum,
                last_autovacuum,
                last_analyze,
                last_autoanalyze
            FROM pg_stat_user_tables 
            WHERE schemaname = 'public'
            ORDER BY n_live_tup DESC
        `);

        res.json({
            success: true,
            data: {
                tableStats: stats.rows,
                performanceStats: performanceStats.rows,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// GET /api/admin/rate-limit/stats/:userId - Estatísticas de rate limit de um usuário
router.get('/rate-limit/stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const stats = await getRateLimitStats(userId);
        
        res.json({
            success: true,
            data: {
                userId,
                rateLimitStats: stats,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Erro ao obter stats de rate limit:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// POST /api/admin/rate-limit/reset/:userId - Resetar rate limit de um usuário
router.post('/rate-limit/reset/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await resetUserRateLimit(userId);
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: {
                    userId,
                    keysDeleted: result.keysDeleted,
                    timestamp: new Date().toISOString()
                }
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.message
            });
        }
    } catch (error) {
        console.error('Erro ao resetar rate limit:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// POST /api/admin/maintenance/refresh-views - Atualizar views materializadas
router.post('/maintenance/refresh-views', async (req, res) => {
    try {
        await db.query('SELECT refresh_materialized_views()');
        
        res.json({
            success: true,
            message: 'Views materializadas atualizadas com sucesso',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro ao atualizar views:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// POST /api/admin/maintenance/cleanup - Limpeza de dados antigos
router.post('/maintenance/cleanup', async (req, res) => {
    try {
        await db.query('SELECT cleanup_old_data()');
        
        res.json({
            success: true,
            message: 'Limpeza de dados concluída com sucesso',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro na limpeza de dados:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// GET /api/admin/performance/queries - Análise de performance de queries
router.get('/performance/queries', async (req, res) => {
    try {
        const analysis = await db.query('SELECT * FROM analyze_query_performance()');
        
        res.json({
            success: true,
            data: {
                queryAnalysis: analysis.rows,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Erro na análise de performance:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// GET /api/admin/database/indexes - Informações sobre índices
router.get('/database/indexes', async (req, res) => {
    try {
        const indexes = await db.query(`
            SELECT 
                schemaname,
                tablename,
                indexname,
                indexdef,
                pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
            FROM pg_indexes 
            WHERE schemaname = 'public'
            ORDER BY pg_relation_size(indexname::regclass) DESC
        `);

        const tablesSizes = await db.query(`
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
                pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        `);
        
        res.json({
            success: true,
            data: {
                indexes: indexes.rows,
                tableSizes: tablesSizes.rows,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Erro ao obter informações de índices:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// POST /api/admin/database/analyze - Executar ANALYZE nas tabelas
router.post('/database/analyze', async (req, res) => {
    try {
        const tables = ['users', 'workouts', 'workout_sessions', 'progress_entries', 'nutrition_entries', 'ai_interactions'];
        
        for (const table of tables) {
            await db.query(`ANALYZE ${table}`);
        }
        
        res.json({
            success: true,
            message: `ANALYZE executado em ${tables.length} tabelas`,
            data: {
                tables,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Erro ao executar ANALYZE:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// GET /api/admin/cache/stats - Estatísticas do cache LLM
router.get('/cache/stats', async (req, res) => {
    try {
        // Esta funcionalidade seria implementada no sistema de cache
        res.json({
            success: true,
            data: {
                message: 'Cache stats não implementado ainda',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Erro ao obter stats do cache:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

module.exports = router;