-- Complete Database Setup for Ririnedoro Timer
-- Run this ENTIRE file in your Supabase SQL Editor
-- This creates all tables with device-based tracking (no auth required)

-- ==========================================
-- 1. CREATE TABLES
-- ==========================================

-- Create pomodoro_sessions table
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    pomodoro_count INTEGER DEFAULT 0,
    total_time INTEGER DEFAULT 0, -- in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily_stats table for tracking daily performance
CREATE TABLE IF NOT EXISTS daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    pomodoro_count INTEGER DEFAULT 0,
    total_time INTEGER DEFAULT 0, -- in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create streaks table
CREATE TABLE IF NOT EXISTS streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    last_pomodoro_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    pomodoros INTEGER DEFAULT 1,
    due_date DATE,
    completed BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'medium', -- low, medium, high
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. CREATE ANONYMOUS ACCESS POLICIES
-- ==========================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Allow anonymous inserts stats" ON daily_stats;
DROP POLICY IF EXISTS "Allow anonymous updates stats" ON daily_stats;
DROP POLICY IF EXISTS "Allow anonymous reads stats" ON daily_stats;
DROP POLICY IF EXISTS "Allow anonymous deletes stats" ON daily_stats;
DROP POLICY IF EXISTS "Allow anonymous inserts sessions" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Allow anonymous updates sessions" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Allow anonymous reads sessions" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Allow anonymous deletes sessions" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Allow anonymous inserts streaks" ON streaks;
DROP POLICY IF EXISTS "Allow anonymous updates streaks" ON streaks;
DROP POLICY IF EXISTS "Allow anonymous reads streaks" ON streaks;
DROP POLICY IF EXISTS "Allow anonymous deletes streaks" ON streaks;
DROP POLICY IF EXISTS "Allow anonymous inserts tasks" ON tasks;
DROP POLICY IF EXISTS "Allow anonymous updates tasks" ON tasks;
DROP POLICY IF EXISTS "Allow anonymous reads tasks" ON tasks;
DROP POLICY IF EXISTS "Allow anonymous deletes tasks" ON tasks;

-- Policies for daily_stats
CREATE POLICY "Allow anonymous inserts stats" ON daily_stats
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous updates stats" ON daily_stats
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous reads stats" ON daily_stats
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous deletes stats" ON daily_stats
    FOR DELETE USING (true);

-- Policies for pomodoro_sessions
CREATE POLICY "Allow anonymous inserts sessions" ON pomodoro_sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous updates sessions" ON pomodoro_sessions
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous reads sessions" ON pomodoro_sessions
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous deletes sessions" ON pomodoro_sessions
    FOR DELETE USING (true);

-- Policies for streaks
CREATE POLICY "Allow anonymous inserts streaks" ON streaks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous updates streaks" ON streaks
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous reads streaks" ON streaks
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous deletes streaks" ON streaks
    FOR DELETE USING (true);

-- Policies for tasks
CREATE POLICY "Allow anonymous inserts tasks" ON tasks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous updates tasks" ON tasks
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous reads tasks" ON tasks
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous deletes tasks" ON tasks
    FOR DELETE USING (true);

-- ==========================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_date ON pomodoro_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON daily_stats(user_id, date);
CREATE INDEX IF NOT EXISTS idx_streaks_user ON streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON tasks(user_id, completed);

-- ==========================================
-- 5. CREATE TRIGGERS FOR UPDATED_AT
-- ==========================================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS update_pomodoro_sessions_updated_at ON pomodoro_sessions;
DROP TRIGGER IF EXISTS update_daily_stats_updated_at ON daily_stats;
DROP TRIGGER IF EXISTS update_streaks_updated_at ON streaks;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for all tables
CREATE TRIGGER update_pomodoro_sessions_updated_at 
    BEFORE UPDATE ON pomodoro_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_stats_updated_at 
    BEFORE UPDATE ON daily_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streaks_updated_at 
    BEFORE UPDATE ON streaks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 6. VERIFY SETUP
-- ==========================================

SELECT 'Setup complete! Tables created:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('pomodoro_sessions', 'daily_stats', 'streaks', 'tasks');

