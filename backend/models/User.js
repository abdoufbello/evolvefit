const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');

// Arquivo para armazenamento persistente
const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const DATA_DIR = path.join(__dirname, '..', 'data');

// Cache em memória para performance
let users = [];
let nextUserId = 1;

// Inicializar armazenamento
const initStorage = async () => {
    try {
        // Criar diretório data se não existir
        await fs.mkdir(DATA_DIR, { recursive: true });
        
        // Tentar carregar dados existentes
        try {
            const data = await fs.readFile(USERS_FILE, 'utf8');
            const parsedData = JSON.parse(data);
            users = parsedData.users || [];
            nextUserId = parsedData.nextUserId || 1;
            console.log(`Carregados ${users.length} usuários do arquivo`);
        } catch (error) {
            // Arquivo não existe ou está vazio, começar com dados vazios
            console.log('Iniciando com base de dados vazia');
            await saveToFile();
        }
    } catch (error) {
        console.error('Erro ao inicializar armazenamento:', error);
    }
};

// Salvar dados no arquivo
const saveToFile = async () => {
    try {
        const data = {
            users,
            nextUserId,
            lastUpdated: new Date().toISOString()
        };
        await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
    }
};

// Inicializar na primeira execução
initStorage();

class User {
    constructor(data) {
        this.id = data.id;
        this.email = data.email;
        this.name = data.name;
        this.password_hash = data.password_hash;
        this.active = data.active;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    /**
     * Criar novo usuário
     */
    static async create(userData) {
        try {
            // Verificar se o email já existe
            const existingUser = await this.findByEmail(userData.email);
            if (existingUser) {
                throw new Error('Email já está em uso');
            }

            // Hash da senha
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

            // Criar usuário em memória
            const newUser = {
                id: nextUserId++,
                name: userData.name,
                email: userData.email.toLowerCase(),
                password_hash: hashedPassword,
                active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            users.push(newUser);
            
            // Salvar no arquivo
            await saveToFile();
            
            return new User(newUser);

        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            throw error;
        }
    }

    /**
     * Buscar usuário por email
     */
    static async findByEmail(email) {
        try {
            const user = users.find(u => u.email === email.toLowerCase());
            return user ? new User(user) : null;
        } catch (error) {
            console.error('Erro ao buscar usuário por email:', error);
            throw error;
        }
    }

    /**
     * Buscar usuário por ID
     */
    static async findById(id) {
        try {
            const user = users.find(u => u.id === parseInt(id));
            return user ? new User(user) : null;
        } catch (error) {
            console.error('Erro ao buscar usuário por ID:', error);
            throw error;
        }
    }

    /**
     * Verificar senha
     */
    async verifyPassword(password) {
        return await bcrypt.compare(password, this.password_hash);
    }

    /**
     * Atualizar senha
     */
    async updatePassword(newPassword) {
        try {
            const userIndex = users.findIndex(u => u.id === this.id);
            if (userIndex === -1) {
                throw new Error('Usuário não encontrado');
            }

            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

            users[userIndex] = {
                ...users[userIndex],
                password_hash: hashedPassword,
                updated_at: new Date().toISOString()
            };

            // Salvar no arquivo
            await saveToFile();

            // Atualizar instância atual
            Object.assign(this, users[userIndex]);
            return this;

        } catch (error) {
            console.error('Erro ao atualizar senha:', error);
            throw error;
        }
    }

    /**
     * Atualizar perfil do usuário
     */
    async updateProfile(profileData) {
        try {
            const userIndex = users.findIndex(u => u.id === this.id);
            if (userIndex === -1) {
                throw new Error('Usuário não encontrado');
            }

            // Atualizar campos permitidos
            const allowedFields = ['name', 'preferences'];
            const updates = {};
            
            allowedFields.forEach(field => {
                if (profileData[field] !== undefined) {
                    updates[field] = profileData[field];
                }
            });

            // Aplicar atualizações
            users[userIndex] = {
                ...users[userIndex],
                ...updates,
                updated_at: new Date().toISOString()
            };

            // Atualizar instância atual
            Object.assign(this, users[userIndex]);
            return this;

        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            throw error;
        }
    }

    /**
     * Desativar usuário (soft delete)
     */
    async deactivate() {
        try {
            const userIndex = users.findIndex(u => u.id === this.id);
            if (userIndex === -1) {
                throw new Error('Usuário não encontrado');
            }

            users[userIndex] = {
                ...users[userIndex],
                active: false,
                updated_at: new Date().toISOString()
            };

            // Salvar no arquivo
            await saveToFile();

            // Atualizar instância atual
            Object.assign(this, users[userIndex]);
            return this;

        } catch (error) {
            console.error('Erro ao desativar usuário:', error);
            throw error;
        }
    }

    /**
     * Converter para JSON (sem senha)
     */
    toJSON() {
        const { password_hash, ...userWithoutPassword } = this;
        return userWithoutPassword;
    }

    /**
     * Validar dados de entrada para criação de usuário
     */
    static validateCreateData(data) {
        const errors = [];

        // Validar email
        if (!data.email) {
            errors.push('Email é obrigatório');
        } else if (!this.isValidEmail(data.email)) {
            errors.push('Email deve ter um formato válido');
        }

        // Validar nome
        if (!data.name) {
            errors.push('Nome é obrigatório');
        } else if (data.name.length < 2) {
            errors.push('Nome deve ter pelo menos 2 caracteres');
        } else if (data.name.length > 100) {
            errors.push('Nome deve ter no máximo 100 caracteres');
        }

        // Validar senha
        if (!data.password) {
            errors.push('Senha é obrigatória');
        } else if (data.password.length < 6) {
            errors.push('Senha deve ter pelo menos 6 caracteres');
        } else if (data.password.length > 128) {
            errors.push('Senha deve ter no máximo 128 caracteres');
        }

        return errors;
    }

    /**
     * Validar formato de email
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Listar usuários (para admin)
     */
    static async list(options = {}) {
        const { limit = 50, offset = 0, search = '' } = options;

        let query = `
            SELECT id, email, name, active, created_at, updated_at
            FROM users
            WHERE active = true
        `;

        const params = [];

        if (search) {
            query += ` AND (name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows.map(row => new User(row));
    }

    /**
     * Contar total de usuários
     */
    static async count(search = '') {
        let query = 'SELECT COUNT(*) FROM users WHERE active = true';
        const params = [];

        if (search) {
            query += ` AND (name ILIKE $1 OR email ILIKE $1)`;
            params.push(`%${search}%`);
        }

        const result = await pool.query(query, params);
        return parseInt(result.rows[0].count);
    }
}

module.exports = User;