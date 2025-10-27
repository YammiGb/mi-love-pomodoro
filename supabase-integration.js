// Supabase Integration for Ririnedoro Timer
// This file provides functions to sync analytics with Supabase

let supabaseClient = null;

// Initialize Supabase (call this after loading the Supabase CDN)
async function initSupabase() {
    try {
        if (typeof supabase !== 'undefined' && window.SUPABASE_CONFIG) {
            supabaseClient = supabase.createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.anonKey
            );
            console.log('Supabase initialized successfully');
            
            // Make client globally available
            window.supabaseClient = supabaseClient;
            
        } else {
            console.log('Supabase CDN not loaded or config missing');
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        return false;
    }
}

// Get current user ID
async function getCurrentUserId() {
    if (supabaseClient) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        return user?.id || null;
    }
    return null;
}

// Generate or get device ID
function getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
}

// Save Pomodoro session to Supabase
async function saveSessionToSupabase(pomodoroCount, totalTime) {
    if (!supabaseClient) {
        console.log('Supabase client not initialized');
        return;
    }
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const deviceId = getDeviceId();
        console.log('Saving with device ID:', deviceId);
        
        // Save to daily_stats
        const { data: statsData, error: statsError } = await supabaseClient
            .from('daily_stats')
            .upsert({
                user_id: deviceId,
                date: today,
                pomodoro_count: pomodoroCount,
                total_time: totalTime
            }, {
                onConflict: 'user_id,date'
            });
        
        if (statsError) {
            console.error('Error saving to daily_stats:', statsError);
        } else {
            console.log('Daily stats saved to Supabase');
        }
        
        // Save to pomodoro_sessions
        const { data: sessionData, error: sessionError } = await supabaseClient
            .from('pomodoro_sessions')
            .insert({
                user_id: deviceId,
                session_date: today,
                pomodoro_count: pomodoroCount,
                total_time: totalTime
            })
            .select();
        
        if (sessionError) {
            console.error('Error saving to pomodoro_sessions:', sessionError);
            console.log('Device ID used:', deviceId);
        } else {
            console.log('Session saved to Supabase:', sessionData);
        }
        
        // Update or create streak
        // First, try to get existing streak
        const { data: existingStreak } = await supabaseClient
            .from('streaks')
            .select('*')
            .eq('user_id', deviceId)
            .single();
        
        if (existingStreak) {
            // Update existing streak
            const { error: streakError } = await supabaseClient
                .from('streaks')
                .update({
                    current_streak: 1,
                    best_streak: Math.max(existingStreak.best_streak || 0, 1),
                    last_pomodoro_date: today
                })
                .eq('user_id', deviceId);
            
            if (streakError) {
                console.error('Error updating streaks:', streakError);
            } else {
                console.log('Streak updated in Supabase');
            }
        } else {
            // Create new streak
            const { error: streakError } = await supabaseClient
                .from('streaks')
                .insert({
                    user_id: deviceId,
                    current_streak: 1,
                    best_streak: 1,
                    last_pomodoro_date: today
                });
            
            if (streakError) {
                console.error('Error saving to streaks:', streakError);
            } else {
                console.log('Streak saved to Supabase');
            }
        }
        
    } catch (error) {
        console.error('Error saving to Supabase:', error);
    }
}

// Get user stats from Supabase
async function getStatsFromSupabase() {
    if (!supabaseClient) return null;
    
    const deviceId = getDeviceId();
    if (!deviceId) return null;
    
    try {
        // Get daily stats for last 7 days
        const { data: dailyStats, error: dailyError } = await supabaseClient
            .from('daily_stats')
            .select('*')
            .eq('user_id', deviceId)
            .order('date', { ascending: false })
            .limit(30);
        
        if (dailyError) throw dailyError;
        
        // Get streaks
        const { data: streaks, error: streakError } = await supabaseClient
            .from('streaks')
            .select('*')
            .eq('user_id', deviceId)
            .single();
        
        if (streakError && streakError.code !== 'PGRST116') throw streakError;
        
        return {
            dailyStats: dailyStats || [],
            streaks: streaks || { current_streak: 0, best_streak: 0 }
        };
    } catch (error) {
        console.error('Error fetching from Supabase:', error);
        return null;
    }
}

// Update streaks in Supabase
async function updateStreaksInSupabase(currentStreak, bestStreak, lastDate) {
    if (!supabaseClient) return;
    
    const deviceId = getDeviceId();
    if (!deviceId) return;
    
    try {
        // First, try to get existing streak
        const { data: existingStreak } = await supabaseClient
            .from('streaks')
            .select('*')
            .eq('user_id', deviceId)
            .single();
        
        if (existingStreak) {
            // Update existing streak
            const { error } = await supabaseClient
                .from('streaks')
                .update({
                    current_streak: currentStreak,
                    best_streak: bestStreak,
                    last_pomodoro_date: lastDate
                })
                .eq('user_id', deviceId);
            
            if (error) throw error;
        } else {
            // Create new streak
            const { error } = await supabaseClient
                .from('streaks')
                .insert({
                    user_id: deviceId,
                    current_streak: currentStreak,
                    best_streak: bestStreak,
                    last_pomodoro_date: lastDate
                });
            
            if (error) throw error;
        }
    } catch (error) {
        console.error('Error updating streaks in Supabase:', error);
    }
}

// Sync local storage with Supabase
async function syncWithSupabase() {
    const localAnalytics = JSON.parse(localStorage.getItem('pomodoroAnalytics') || '{}');
    const deviceId = getDeviceId();
    
    if (!supabaseClient || !deviceId) {
        console.log('Supabase not initialized or device ID not available');
        return;
    }
    
    // Upload local data to Supabase
    if (localAnalytics.totalPomodoros > 0) {
        await saveSessionToSupabase(
            localAnalytics.totalPomodoros,
            localAnalytics.totalTime
        );
    }
    
    // Update streaks
    if (localAnalytics.bestStreak) {
        await updateStreaksInSupabase(
            localAnalytics.currentStreak || 0,
            localAnalytics.bestStreak,
            localAnalytics.lastPomodoroDate
        );
    }
    
    console.log('Synced with Supabase');
}

// Auto-sync every 5 minutes
let syncInterval = null;

function startAutoSync() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(syncWithSupabase, 5 * 60 * 1000); // 5 minutes
}

function stopAutoSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

// Export functions for use in other files
window.SupabaseIntegration = {
    init: initSupabase,
    saveSession: saveSessionToSupabase,
    getStats: getStatsFromSupabase,
    updateStreaks: updateStreaksInSupabase,
    sync: syncWithSupabase,
    startAutoSync,
    stopAutoSync
};

