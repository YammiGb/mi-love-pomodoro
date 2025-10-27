-- Fix Supabase Schema to use TEXT for user_id instead of UUID
-- Run this in your Supabase SQL Editor

-- Drop existing foreign key constraints (if they exist)
ALTER TABLE IF EXISTS pomodoro_sessions 
    DROP CONSTRAINT IF EXISTS pomodoro_sessions_user_id_fkey;

ALTER TABLE IF EXISTS daily_stats 
    DROP CONSTRAINT IF EXISTS daily_stats_user_id_fkey;

ALTER TABLE IF EXISTS streaks 
    DROP CONSTRAINT IF EXISTS streaks_user_id_fkey;

ALTER TABLE IF EXISTS tasks 
    DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;

-- Change user_id from UUID to TEXT
-- For pomodoro_sessions
ALTER TABLE IF EXISTS pomodoro_sessions 
    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- For daily_stats
ALTER TABLE IF EXISTS daily_stats 
    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- For streaks
ALTER TABLE IF EXISTS streaks 
    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- For tasks
ALTER TABLE IF EXISTS tasks 
    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Verify the changes
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('pomodoro_sessions', 'daily_stats', 'streaks', 'tasks')
AND column_name = 'user_id'
ORDER BY table_name;

