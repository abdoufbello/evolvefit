-- EvolveFit Initial Database Schema
-- This file will be executed automatically when the PostgreSQL container starts

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    height_cm INTEGER,
    weight_kg DECIMAL(5,2),
    fitness_level VARCHAR(50) DEFAULT 'beginner',
    goals TEXT[],
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    workout_type VARCHAR(100),
    difficulty_level VARCHAR(50),
    estimated_duration INTEGER, -- in minutes
    exercises JSONB NOT NULL DEFAULT '[]',
    ai_generated BOOLEAN DEFAULT false,
    llm_prompt TEXT,
    llm_response JSONB,
    embedding vector(1536), -- OpenAI embedding dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workout sessions (completed workouts)
CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    exercises_completed JSONB DEFAULT '[]',
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    calories_burned INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Progress tracking
CREATE TABLE IF NOT EXISTS progress_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    weight_kg DECIMAL(5,2),
    body_fat_percentage DECIMAL(4,2),
    muscle_mass_kg DECIMAL(5,2),
    measurements JSONB DEFAULT '{}', -- chest, waist, arms, etc.
    photos TEXT[], -- URLs to progress photos
    notes TEXT,
    ai_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Nutrition entries
CREATE TABLE IF NOT EXISTS nutrition_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    meal_type VARCHAR(50), -- breakfast, lunch, dinner, snack
    foods JSONB NOT NULL DEFAULT '[]',
    total_calories INTEGER,
    macros JSONB DEFAULT '{}', -- protein, carbs, fat
    ai_recommendations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI interactions log
CREATE TABLE IF NOT EXISTS ai_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interaction_type VARCHAR(100) NOT NULL, -- workout_generation, progress_analysis, nutrition_advice
    input_data JSONB NOT NULL,
    llm_response JSONB,
    n8n_webhook_url VARCHAR(500),
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_type ON workouts(workout_type);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_progress_user_date ON progress_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_nutrition_user_date ON nutrition_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_type ON ai_interactions(user_id, interaction_type);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS idx_workouts_embedding ON workouts USING ivfflat (embedding vector_cosine_ops);

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON workouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default data
INSERT INTO users (email, password_hash, first_name, last_name, fitness_level) 
VALUES ('demo@evolvefit.com', '$2a$10$example.hash.for.demo.user', 'Demo', 'User', 'intermediate')
ON CONFLICT (email) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'EvolveFit database schema initialized successfully!';
    RAISE NOTICE 'pgvector extension: %', (SELECT extname FROM pg_extension WHERE extname = 'vector');
END $$;