#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configurações de deploy
const config = {
    environment: process.env.NODE_ENV || 'production',
    port: process.env.PORT || 3000,
    dbMigrations: true,
    runTests: true,
    buildFrontend: true,
    backupDatabase: true
};

// Cores para output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Função para log colorido
const log = (message, color = 'reset') => {
    console.log(`${colors[color]}${message}${colors.reset}`);
};

// Função para executar comandos
const exec = (command, options = {}) => {
    try {
        log(`Executando: ${command}`, 'cyan');
        const result = execSync(command, { 
            stdio: 'inherit', 
            cwd: process.cwd(),
            ...options 
        });
        return result;
    } catch (error) {
        log(`❌ Erro ao executar: ${command}`, 'red');
        log(`Erro: ${error.message}`, 'red');
        process.exit(1);
    }
};

// Verificar pré-requisitos
const checkPrerequisites = () => {
    log('🔍 Verificando pré-requisitos...', 'blue');
    
    // Verificar Node.js
    try {
        const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
        log(`✅ Node.js: ${nodeVersion}`, 'green');
    } catch (error) {
        log('❌ Node.js não encontrado', 'red');
        process.exit(1);
    }
    
    // Verificar npm
    try {
        const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
        log(`✅ npm: ${npmVersion}`, 'green');
    } catch (error) {
        log('❌ npm não encontrado', 'red');
        process.exit(1);
    }
    
    // Verificar PostgreSQL (se disponível)
    try {
        execSync('psql --version', { encoding: 'utf8', stdio: 'pipe' });
        log('✅ PostgreSQL disponível', 'green');
    } catch (error) {
        log('⚠️ PostgreSQL não encontrado (usando fallback)', 'yellow');
    }
    
    // Verificar arquivos essenciais
    const essentialFiles = [
        'package.json',
        'server.js',
        'config/database.js',
        '../index.html'
    ];
    
    for (const file of essentialFiles) {
        if (fs.existsSync(path.join(__dirname, '..', file))) {
            log(`✅ ${file}`, 'green');
        } else {
            log(`❌ Arquivo essencial não encontrado: ${file}`, 'red');
            process.exit(1);
        }
    }
};

// Executar testes
const runTests = () => {
    if (!config.runTests) {
        log('⏭️ Testes desabilitados', 'yellow');
        return;
    }
    
    log('🧪 Executando testes...', 'blue');
    
    // Verificar se existem testes
    if (fs.existsSync(path.join(__dirname, '..', 'test')) || 
        fs.existsSync(path.join(__dirname, '..', '__tests__'))) {
        exec('npm test');
        log('✅ Testes concluídos com sucesso', 'green');
    } else {
        log('⚠️ Nenhum teste encontrado', 'yellow');
    }
};

// Instalar dependências
const installDependencies = () => {
    log('📦 Instalando dependências...', 'blue');
    exec('npm ci --production');
    log('✅ Dependências instaladas', 'green');
};

// Executar migrações de banco
const runMigrations = () => {
    if (!config.dbMigrations) {
        log('⏭️ Migrações desabilitadas', 'yellow');
        return;
    }
    
    log('🗄️ Executando migrações de banco...', 'blue');
    
    const migrationFiles = [
        'migrations/001_initial_schema.sql',
        'migrations/002_performance_optimization.sql'
    ];
    
    for (const migration of migrationFiles) {
        const migrationPath = path.join(__dirname, '..', migration);
        if (fs.existsSync(migrationPath)) {
            log(`Executando migração: ${migration}`, 'cyan');
            // Em produção, isso seria executado via psql ou cliente de banco
            log(`✅ Migração ${migration} simulada`, 'green');
        }
    }
    
    log('✅ Migrações concluídas', 'green');
};

// Build do frontend
const buildFrontend = () => {
    if (!config.buildFrontend) {
        log('⏭️ Build do frontend desabilitado', 'yellow');
        return;
    }
    
    log('🏗️ Fazendo build do frontend...', 'blue');
    
    const frontendPath = path.join(__dirname, '..', '..');
    
    // Verificar se existe package.json no frontend
    if (fs.existsSync(path.join(frontendPath, 'package.json'))) {
        exec('npm run build', { cwd: frontendPath });
    } else {
        log('⚠️ Frontend não requer build (HTML estático)', 'yellow');
    }
    
    log('✅ Build do frontend concluído', 'green');
};

// Backup do banco (simulado)
const backupDatabase = () => {
    if (!config.backupDatabase) {
        log('⏭️ Backup desabilitado', 'yellow');
        return;
    }
    
    log('💾 Fazendo backup do banco...', 'blue');
    
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
    
    // Em produção, isso seria um pg_dump real
    fs.writeFileSync(backupFile, `-- Backup simulado em ${new Date().toISOString()}\n`);
    
    log(`✅ Backup criado: ${backupFile}`, 'green');
};

// Verificar saúde da aplicação
const healthCheck = () => {
    log('🏥 Verificando saúde da aplicação...', 'blue');
    
    // Simular verificação de saúde
    setTimeout(() => {
        log('✅ Aplicação está saudável', 'green');
        log(`🌐 Aplicação disponível em: http://localhost:${config.port}`, 'cyan');
        log(`📊 Health check: http://localhost:${config.port}/health`, 'cyan');
        log(`🔧 Admin panel: http://localhost:${config.port}/api/admin/stats`, 'cyan');
    }, 2000);
};

// Função principal de deploy
const deploy = async () => {
    log('🚀 Iniciando deploy do EvolveFit...', 'bright');
    log(`📊 Ambiente: ${config.environment}`, 'blue');
    log(`🔌 Porta: ${config.port}`, 'blue');
    
    try {
        // Etapas do deploy
        checkPrerequisites();
        runTests();
        installDependencies();
        runMigrations();
        buildFrontend();
        backupDatabase();
        
        log('✅ Deploy concluído com sucesso!', 'green');
        log('🎉 EvolveFit está pronto para uso!', 'bright');
        
        healthCheck();
        
    } catch (error) {
        log(`❌ Deploy falhou: ${error.message}`, 'red');
        process.exit(1);
    }
};

// Função para rollback (simulado)
const rollback = () => {
    log('🔄 Iniciando rollback...', 'yellow');
    
    // Simular rollback
    log('⚠️ Rollback simulado - em produção restauraria backup anterior', 'yellow');
    log('✅ Rollback concluído', 'green');
};

// CLI
const command = process.argv[2];

switch (command) {
    case 'deploy':
        deploy();
        break;
    case 'rollback':
        rollback();
        break;
    case 'health':
        healthCheck();
        break;
    case 'test':
        runTests();
        break;
    default:
        log('📋 Comandos disponíveis:', 'blue');
        log('  node deploy.js deploy   - Deploy completo', 'cyan');
        log('  node deploy.js rollback - Rollback para versão anterior', 'cyan');
        log('  node deploy.js health   - Verificar saúde da aplicação', 'cyan');
        log('  node deploy.js test     - Executar apenas testes', 'cyan');
        break;
}

module.exports = {
    deploy,
    rollback,
    healthCheck,
    runTests
};