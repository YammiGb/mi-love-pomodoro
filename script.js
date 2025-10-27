// --- Pomodoro Settings (Global Variable) ---
let TIMES = {
    pomodoro: 25,
    shortBreak: 5,   
    longBreak: 15    
};
let LONG_BREAK_TRIGGER = 4;
// -------------------------------------

let currentPhase = 'pomodoro';
let pomodorosCompleted = 0;
let timeRemaining = TIMES.pomodoro * 60; 
let isRunning = false;
let timerInterval;
let wakeLock = null;

// Session statistics
let sessionStats = {
    pomodoros: 0,
    shortBreaks: 0,
    longBreaks: 0
};

// DOM Elements
const display = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const modeButtons = document.querySelectorAll('.modes button');
const pomodoroBtn = document.getElementById('pomodoro-btn');
const shortBreakBtn = document.getElementById('shortBreak-btn');
const longBreakBtn = document.getElementById('longBreak-btn');

// Customization Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const applyBtn = document.getElementById('apply-btn');
const customInputs = {
    pomodoro: document.getElementById('custom-pomodoro'),
    shortBreak: document.getElementById('custom-shortBreak'),
    longBreak: document.getElementById('custom-longBreak'),
    intervals: document.getElementById('custom-intervals'),
    volume: document.getElementById('custom-volume')
};

// Sound volume (0 to 1)
let soundVolume = 0.5;
let timerSound = null;
let audioUnlocked = false;

// --- Utility Function: Removed status messages for cleaner UI ---

// --- Audio Functions ---
function initializeAudio() {
    if (audioUnlocked) return;
    
    try {
        // Create and preload audio with proper attributes for mobile
        timerSound = new Audio('timerSound.mp3');
        timerSound.preload = 'auto';
        timerSound.volume = 1.0; // Set to max for reliable mobile playback
        
        // For iOS, ensure audio plays even when device is on silent
        // iOS respects silent mode for web audio, so we can only try
        console.log('Audio file loading: timerSound.mp3');
        
        console.log('Creating audio object, volume set to:', timerSound.volume);
        
        // Load the audio file
        timerSound.load();
        
        // Unlock audio for mobile browsers by playing and pausing immediately
        const playPromise = timerSound.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('Audio play promise resolved - unlocking');
                timerSound.pause();
                timerSound.currentTime = 0;
                audioUnlocked = true;
                timerSound.volume = soundVolume; // Apply user's volume setting after unlock
                console.log('Audio unlocked for mobile playback, final volume:', timerSound.volume);
                
                // Test sound automatically after unlock (run testSound() manually if needed)
                // setTimeout(() => testSound(), 1000);
            }).catch(error => {
                console.error('Audio unlock error:', error.name, error.message);
            });
        } else {
            // If no promise returned, assume it's unlocked
            audioUnlocked = true;
            console.log('Audio object created (no promise returned)');
        }
    } catch (error) {
        console.error('Error initializing audio:', error);
    }
}

// Test sound function - exposed globally for debugging
window.testSound = function() {
    if (timerSound && audioUnlocked) {
        console.log('Testing sound...');
        timerSound.volume = 1.0;
        timerSound.currentTime = 0;
        timerSound.play().then(() => {
            console.log('Test sound played successfully');
        }).catch(error => {
            console.error('Test sound error:', error.name, error.message);
        });
    } else {
        console.log('Audio not initialized. Timer sound:', !!timerSound, 'Audio unlocked:', audioUnlocked);
    }
}

// --- Vibration Functions ---
function vibrateTimerEnd() {
    // Vibrate pattern: vibrate-200ms, pause-100ms, vibrate-200ms, pause-100ms, vibrate-200ms
    const pattern = [200, 100, 200, 100, 200];
    
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
        console.log('Vibration triggered');
    } else {
        console.log('Vibration API not supported');
    }
}

// Test vibration function
window.testVibration = function() {
    vibrateTimerEnd();
}

// --- Wake Lock Functions ---
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake lock activated - screen will stay awake');
            
            // Re-request wake lock if it's released (e.g., screen lock)
            wakeLock.addEventListener('release', () => {
                console.log('Wake lock released');
                // Re-request if timer is still running
                if (isRunning) {
                    requestWakeLock();
                }
            });
        } else {
            console.log('Wake Lock API not supported in this browser');
        }
    } catch (err) {
        console.log('Wake lock error:', err.name, err.message);
    }
}

function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release().then(() => {
            wakeLock = null;
            console.log('Wake lock released');
        }).catch((err) => {
            console.log('Error releasing wake lock:', err);
        });
    }
}

// --- Core Logic Functions ---

function updateDisplay() {
    if (isNaN(timeRemaining) || timeRemaining < 0) {
        display.textContent = "00:00"; 
        display.classList.remove('blink');
        return;
    }
    
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    
    display.textContent = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    document.title = `${display.textContent} - ${currentPhase.toUpperCase()}`;
    
    // Add blinking effect in last 10 seconds
    if (timeRemaining <= 10) {
        display.classList.add('blink');
    } else {
        display.classList.remove('blink');
    }
}

function startTimer() {
    if (isRunning || timeRemaining <= 0) return;
    settingsPanel.classList.add('hidden');
    isRunning = true;
    startBtn.textContent = 'PAUSE';
    
    // Request wake lock to keep screen awake
    requestWakeLock();

    timerInterval = setInterval(() => {
        timeRemaining--;
        updateDisplay();
        updateProgressBar();

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            isRunning = false;
            releaseWakeLock(); // Release wake lock when timer ends
            handlePhaseEnd();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    startBtn.textContent = 'START';
    updateProgressBar();
    
    // Release wake lock when timer is paused
    releaseWakeLock();
}

function resetTimer() {
    pauseTimer();
    display.classList.remove('blink');
    setPhase(currentPhase);
    startBtn.textContent = 'START';
}

function updateSessionStats() {
    if (pomodoroBtn) {
        pomodoroBtn.textContent = sessionStats.pomodoros > 0 ? `Pomodoro (${sessionStats.pomodoros})` : 'Pomodoro';
    }
    if (shortBreakBtn) {
        shortBreakBtn.textContent = sessionStats.shortBreaks > 0 ? `Short Break (${sessionStats.shortBreaks})` : 'Short Break';
    }
    if (longBreakBtn) {
        longBreakBtn.textContent = sessionStats.longBreaks > 0 ? `Long Break (${sessionStats.longBreaks})` : 'Long Break';
    }
}

function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar-fullscreen');
    if (!progressBar) return;
    
    const totalTime = TIMES[currentPhase] * 60;
    const progress = 1 - (timeRemaining / totalTime);
    
    // Determine next phase and color
    let nextPhaseColor;
    if (currentPhase === 'pomodoro') {
        nextPhaseColor = pomodorosCompleted % LONG_BREAK_TRIGGER === 0 ? 'rgba(34, 72, 122, 0.3)' : 'rgba(42, 97, 153, 0.3)'; // long break or short break
    } else {
        nextPhaseColor = 'rgba(49, 121, 184, 0.3)'; // pomodoro
    }
    
    // Update progress bar - fill from bottom to top
    progressBar.style.height = `${progress * 100}%`;
    progressBar.style.backgroundColor = nextPhaseColor;
}

function handlePhaseEnd() {
    // Vibrate when timer ends (works even on silent mode)
    vibrateTimerEnd();
    
    // Play sound when timer ends
    if (timerSound && audioUnlocked) {
        console.log('Attempting to play sound, volume:', soundVolume);
        timerSound.volume = 1.0; // Force max volume for mobile
        timerSound.currentTime = 0; // Reset to beginning
        
        const playPromise = timerSound.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('Sound playing successfully');
            }).catch(error => {
                console.error('Could not play sound:', error.name, error.message);
                // Retry with lower volume
                timerSound.volume = soundVolume;
                timerSound.play().catch(err => console.error('Retry failed:', err));
            });
        }
    } else {
        console.log('Audio not initialized yet. Timer sound:', !!timerSound, 'Audio unlocked:', audioUnlocked);
    }

    if (currentPhase === 'pomodoro') {
        pomodorosCompleted++;
        sessionStats.pomodoros++;
        trackPomodoroComplete();
        
        // Increment task pomodoro if task is selected
        if (window.TasksManager && window.TasksManager.incrementTaskPomodoro) {
            window.TasksManager.incrementTaskPomodoro();
        }
        
        if (pomodorosCompleted % LONG_BREAK_TRIGGER === 0) {
            setPhase('longBreak');
        } else {
            setPhase('shortBreak');
        }
    } else if (currentPhase === 'shortBreak') {
        sessionStats.shortBreaks++;
        setPhase('pomodoro');
    } else if (currentPhase === 'longBreak') {
        sessionStats.longBreaks++;
        setPhase('pomodoro');
    }
    
    updateSessionStats();
    startTimer();
}

// --- Phase Management ---

function setPhase(phase) {
    currentPhase = phase;
    timeRemaining = TIMES[phase] * 60;
    updateDisplay();
    updateModeButtons();
    updateBodyStyle(phase);
    updateStartButton(phase);
    updateApplyButton(phase);
    updateProgressBar();
}

// ... (updateModeButtons and updateBodyStyle functions remain unchanged) ...

function updateModeButtons() {
    modeButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.id.includes(currentPhase)) {
            btn.classList.add('active');
        }
    });
}

function updateBodyStyle(phase) {
    const colorMap = {
        pomodoro: '#3179b8',
        shortBreak: '#2a6199',
        longBreak: '#22487a'
    };
    document.body.style.backgroundColor = colorMap[phase];
}

function updateStartButton(phase) {
    const colorMap = {
        pomodoro: '#3179b8',
        shortBreak: '#2a6199',
        longBreak: '#22487a'
    };
    startBtn.style.color = colorMap[phase];
}

function updateApplyButton(phase) {
    const colorMap = {
        pomodoro: '#3179b8',
        shortBreak: '#2a6199',
        longBreak: '#22487a'
    };
    applyBtn.style.background = colorMap[phase];
}


// --- Customization Logic ---

function applyCustomSettings() {
    const newPomodoro = parseInt(customInputs.pomodoro.value);
    const newShortBreak = parseInt(customInputs.shortBreak.value);
    const newLongBreak = parseInt(customInputs.longBreak.value);
    const newIntervals = parseInt(customInputs.intervals.value);
    const newVolume = parseInt(customInputs.volume.value) / 100; // Convert 0-100 to 0-1

    if (newPomodoro > 0 && newShortBreak > 0 && newLongBreak > 0 && newIntervals > 0) {
        TIMES.pomodoro = newPomodoro;
        TIMES.shortBreak = newShortBreak;
        TIMES.longBreak = newLongBreak;
        LONG_BREAK_TRIGGER = newIntervals;
        soundVolume = newVolume;
        
        // Update timer sound volume if it exists
        if (timerSound) {
            timerSound.volume = soundVolume;
            console.log('Volume updated to:', soundVolume);
        }
        
        // Save to localStorage
        localStorage.setItem('pomodoroSettings', JSON.stringify({
            pomodoro: newPomodoro,
            shortBreak: newShortBreak,
            longBreak: newLongBreak,
            intervals: newIntervals,
            volume: newVolume
        }));
        
        pauseTimer();
        setPhase(currentPhase);
        settingsPanel.classList.add('hidden'); 
    }
}

function toggleSettingsPanel() {
    settingsPanel.classList.toggle('hidden');
    if (!settingsPanel.classList.contains('hidden')) {
        analyticsPanel.classList.add('hidden');
    }
    pauseTimer();
}

// --- Analytics ---

// Load analytics from localStorage
function loadAnalytics() {
    const saved = localStorage.getItem('pomodoroAnalytics');
    if (saved) {
        return JSON.parse(saved);
    }
    return {
        totalPomodoros: 0,
        totalTime: 0,
        todayPomodoros: 0,
        lastDate: new Date().toDateString(),
        bestStreak: 0,
        currentStreak: 0,
        lastPomodoroDate: null,
        dailyData: {}
    };
}

function saveAnalytics(analytics) {
    localStorage.setItem('pomodoroAnalytics', JSON.stringify(analytics));
}

function updateAnalyticsDisplay() {
    const analytics = loadAnalytics();
    
    // Update today's count if it's a new day
    const today = new Date().toDateString();
    if (analytics.lastDate !== today) {
        analytics.todayPomodoros = 0;
        analytics.lastDate = today;
    }
    
    document.getElementById('total-pomodoros').textContent = analytics.totalPomodoros;
    document.getElementById('today-pomodoros').textContent = analytics.todayPomodoros;
    
    const hours = Math.floor(analytics.totalTime / 60);
    const minutes = analytics.totalTime % 60;
    if (hours > 0) {
        document.getElementById('total-time').textContent = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
        document.getElementById('total-time').textContent = `${minutes}m`;
    }
    
    const streakDays = analytics.bestStreak;
    document.getElementById('best-streak').textContent = streakDays === 1 ? '1 day' : `${streakDays} days`;
    drawChart();
}

function drawChart() {
    const canvas = document.getElementById('stats-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const analytics = loadAnalytics();
    const dailyData = analytics.dailyData || {};
    
    // Get Monday to Sunday of the current week
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days to get to Monday
    
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - daysToMonday + i);
        const dateStr = date.toDateString();
        last7Days.push({
            date: date,
            dateStr: dateStr,
            count: dailyData[dateStr] || 0,
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' })
        });
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;
    
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxValue = Math.max(1, ...last7Days.map(d => d.count));
    
    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Draw bars
    const barWidth = chartWidth / last7Days.length;
    last7Days.forEach((day, index) => {
        const barHeight = (day.count / maxValue) * chartHeight;
        const x = padding + index * barWidth;
        const y = padding + chartHeight - barHeight;
        
        // Gradient for bars
        const gradient = ctx.createLinearGradient(x, padding, x, y + barHeight);
        gradient.addColorStop(0, '#3179b8');
        gradient.addColorStop(1, '#2a6199');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x + 5, y, barWidth - 10, barHeight);
        
        // Draw number labels on top of bars
        if (day.count > 0) {
            ctx.fillStyle = '#3179b8';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(day.count, x + barWidth / 2, y - 5);
        }
        
        // Draw day labels at bottom
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(day.dayName, x + barWidth / 2, height - 5);
    });
}

function trackPomodoroComplete() {
    const analytics = loadAnalytics();
    analytics.totalPomodoros++;
    analytics.todayPomodoros++;
    analytics.totalTime += TIMES.pomodoro;
    
    // Track daily data for charts
    const today = new Date().toDateString();
    if (!analytics.dailyData) analytics.dailyData = {};
    analytics.dailyData[today] = (analytics.dailyData[today] || 0) + 1;
    
    // Update streak
    if (analytics.lastPomodoroDate !== today) {
        const lastDate = analytics.lastPomodoroDate ? new Date(analytics.lastPomodoroDate) : null;
        if (lastDate) {
            const daysDiff = Math.floor((new Date(today) - lastDate) / (1000 * 60 * 60 * 24));
            if (daysDiff === 1) {
                analytics.currentStreak++;
            } else if (daysDiff > 1) {
                analytics.currentStreak = 1;
            }
        } else {
            analytics.currentStreak = 1;
        }
        analytics.bestStreak = Math.max(analytics.bestStreak, analytics.currentStreak);
    }
    
    analytics.lastPomodoroDate = today;
    saveAnalytics(analytics);
    updateAnalyticsDisplay();
    drawChart();
    
    // Save to Supabase if available
    if (window.SupabaseIntegration) {
        console.log('Attempting to save to Supabase...');
        window.SupabaseIntegration.saveSession(1, TIMES.pomodoro);
    } else {
        console.log('Supabase integration not available');
    }
}

function resetStats() {
    localStorage.removeItem('pomodoroAnalytics');
    updateAnalyticsDisplay();
    drawChart();
}

// Analytics Elements
const analyticsBtn = document.getElementById('analytics-btn');
const analyticsPanel = document.getElementById('analytics-panel');
const resetStatsBtn = document.getElementById('reset-stats-btn');
const backBtn = document.getElementById('back-btn');

function toggleAnalyticsPanel() {
    const isOpening = analyticsPanel.classList.contains('hidden');
    analyticsPanel.classList.toggle('hidden');
    if (isOpening) {
        settingsPanel.classList.add('hidden');
        updateAnalyticsDisplay();
        // Timer keeps running while viewing analytics
    }
}

// --- Event Listeners ---

startBtn.addEventListener('click', () => {
    // Initialize audio on first user interaction (required for mobile)
    initializeAudio();
    
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
});

resetBtn.addEventListener('click', resetTimer);
applyBtn.addEventListener('click', applyCustomSettings);
settingsBtn.addEventListener('click', toggleSettingsPanel);
analyticsBtn.addEventListener('click', toggleAnalyticsPanel);
resetStatsBtn.addEventListener('click', resetStats);
backBtn.addEventListener('click', () => {
    analyticsPanel.classList.add('hidden');
});

modeButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const newPhase = e.target.id.replace('-btn', '');
        setPhase(newPhase);
        pauseTimer(); 
    });
});

// Load saved settings
const savedSettings = localStorage.getItem('pomodoroSettings');
if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    if (settings.pomodoro) TIMES.pomodoro = settings.pomodoro;
    if (settings.shortBreak) TIMES.shortBreak = settings.shortBreak;
    if (settings.longBreak) TIMES.longBreak = settings.longBreak;
    if (settings.intervals) LONG_BREAK_TRIGGER = settings.intervals;
    if (settings.volume !== undefined) soundVolume = settings.volume;
    
    // Update input values
    customInputs.pomodoro.value = TIMES.pomodoro;
    customInputs.shortBreak.value = TIMES.shortBreak;
    customInputs.longBreak.value = TIMES.longBreak;
    customInputs.intervals.value = LONG_BREAK_TRIGGER;
    customInputs.volume.value = Math.round(soundVolume * 100);
}

// Initial setup
setPhase('pomodoro');
updateAnalyticsDisplay();
updateSessionStats();

// Initialize Supabase when page loads
window.addEventListener('load', async () => {
    if (window.SupabaseIntegration) {
        const initialized = await window.SupabaseIntegration.init();
        if (initialized) {
            console.log('Supabase integration ready');
        } else {
            console.log('Supabase integration not available - using local storage only');
        }
    }
});

// Handle visibility change to re-request wake lock if needed
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && isRunning && !wakeLock) {
        // Page is visible again, timer is running, but wake lock was released
        // Re-request wake lock
        requestWakeLock();
    }
});