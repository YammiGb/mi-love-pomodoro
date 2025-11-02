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
let targetEndTime = null; // Timestamp when timer should end

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
    
    try {
        if ('vibrate' in navigator) {
            const result = navigator.vibrate(pattern);
            console.log('Vibration triggered, result:', result);
            
            // If vibrate returns false, the pattern is too long or not supported
            if (result === false) {
                console.log('Vibration pattern rejected, trying simpler pattern');
                // Try a simpler pattern as fallback
                navigator.vibrate(200);
            }
        } else {
            console.log('Vibration API not supported in this browser');
        }
    } catch (error) {
        console.error('Error with vibration:', error);
    }
}

// Test vibration function
window.testVibration = function() {
    console.log('Testing vibration...');
    console.log('navigator.vibrate available:', 'vibrate' in navigator);
    
    // Try multiple patterns to see which works
    if ('vibrate' in navigator) {
        console.log('Attempting simple vibration (200ms)...');
        navigator.vibrate(200);
        
        setTimeout(() => {
            console.log('Attempting complex vibration pattern...');
            vibrateTimerEnd();
        }, 500);
    } else {
        console.log('Vibration API not available');
    }
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
    
    // Calculate target end time (timestamp-based for background accuracy)
    targetEndTime = Date.now() + (timeRemaining * 1000);
    saveTimerState();
    
    // Request wake lock to keep screen awake
    requestWakeLock();

    timerInterval = setInterval(() => {
        // Calculate actual remaining time based on target end time
        const now = Date.now();
        timeRemaining = Math.ceil((targetEndTime - now) / 1000);
        
        if (timeRemaining < 0) timeRemaining = 0;
        
        updateDisplay();
        updateProgressBar();

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            isRunning = false;
            targetEndTime = null;
            releaseWakeLock(); // Release wake lock when timer ends
            clearTimerState();
            handlePhaseEnd();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    startBtn.textContent = 'START';
    targetEndTime = null;
    updateProgressBar();
    saveTimerState();
    
    // Release wake lock when timer is paused
    releaseWakeLock();
}

function resetTimer() {
    pauseTimer();
    display.classList.remove('blink');
    setPhase(currentPhase);
    startBtn.textContent = 'START';
    clearTimerState();
}

// --- Timer State Persistence (for background running) ---

function saveTimerState() {
    const state = {
        currentPhase,
        timeRemaining,
        isRunning,
        targetEndTime,
        pomodorosCompleted,
        timestamp: Date.now()
    };
    localStorage.setItem('timerState', JSON.stringify(state));
}

function clearTimerState() {
    localStorage.removeItem('timerState');
}

function restoreTimerState() {
    const saved = localStorage.getItem('timerState');
    if (!saved) return false;
    
    try {
        const state = JSON.parse(saved);
        
        // If timer was running, check if it should have ended
        if (state.isRunning && state.targetEndTime) {
            const now = Date.now();
            const remainingMs = state.targetEndTime - now;
            
            if (remainingMs > 0) {
                // Timer still running
                currentPhase = state.currentPhase;
                timeRemaining = Math.ceil(remainingMs / 1000);
                pomodorosCompleted = state.pomodorosCompleted || 0;
                updateDisplay();
                updateModeButtons();
                updateBodyStyle(currentPhase);
                updateStartButton(currentPhase);
                updateApplyButton(currentPhase);
                
                // Auto-resume timer
                console.log('Resuming timer from background...');
                startTimer();
                return true;
            } else {
                // Timer should have ended while we were gone
                console.log('Timer ended while in background');
                currentPhase = state.currentPhase;
                pomodorosCompleted = state.pomodorosCompleted || 0;
                timeRemaining = 0;
                clearTimerState();
                handlePhaseEnd();
                return true;
            }
        } else if (!state.isRunning) {
            // Timer was paused, restore the paused state
            currentPhase = state.currentPhase;
            timeRemaining = state.timeRemaining;
            pomodorosCompleted = state.pomodorosCompleted || 0;
            updateDisplay();
            updateModeButtons();
            updateBodyStyle(currentPhase);
            updateStartButton(currentPhase);
            updateApplyButton(currentPhase);
            return true;
        }
    } catch (error) {
        console.error('Error restoring timer state:', error);
        clearTimerState();
    }
    
    return false;
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
    console.log('Timer ended - attempting to vibrate');
    
    // Try vibration with multiple patterns for better compatibility
    if ('vibrate' in navigator) {
        // Try the complex pattern first
        let result = navigator.vibrate([200, 100, 200, 100, 200]);
        console.log('Complex vibration pattern result:', result);
        
        // If that doesn't work, try simpler
        if (!result) {
            console.log('Trying simpler vibration pattern');
            navigator.vibrate([300, 100, 300]);
        }
    } else {
        console.log('Vibration API not available - likely iOS or unsupported browser');
    }
    
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

    // Save the completed phase BEFORE changing it
    const completedPhase = currentPhase;
    
    // Determine next phase
    let nextPhase = 'pomodoro';
    
    if (currentPhase === 'pomodoro') {
        pomodorosCompleted++;
        sessionStats.pomodoros++;
        trackPomodoroComplete();
        
        // Increment task pomodoro if task is selected
        if (window.TasksManager && window.TasksManager.incrementTaskPomodoro) {
            window.TasksManager.incrementTaskPomodoro();
        }
        
        if (pomodorosCompleted % LONG_BREAK_TRIGGER === 0) {
            nextPhase = 'longBreak';
            setPhase('longBreak');
        } else {
            nextPhase = 'shortBreak';
            setPhase('shortBreak');
        }
    } else if (currentPhase === 'shortBreak') {
        sessionStats.shortBreaks++;
        trackBreakComplete('shortBreak');
        nextPhase = 'pomodoro';
        setPhase('pomodoro');
    } else if (currentPhase === 'longBreak') {
        sessionStats.longBreaks++;
        trackBreakComplete('longBreak');
        nextPhase = 'pomodoro';
        setPhase('pomodoro');
    }
    
    // Show notification with the COMPLETED phase, not the new current phase
    showCompletionNotification(completedPhase, nextPhase);
    
    updateSessionStats();
    startTimer();
}

// Show completion notification using multiple methods
async function showCompletionNotification(completedPhase, nextPhase) {
    // Method 1: Try Service Worker notification (works in background)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
            navigator.serviceWorker.controller.postMessage({
                type: 'TIMER_COMPLETE',
                phase: completedPhase,
                nextPhase: nextPhase
            });
            console.log('Sent notification request to Service Worker');
        } catch (error) {
            console.error('Service Worker notification failed:', error);
        }
    }
    
    // Method 2: Direct Notification API (fallback, works if app is in foreground)
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            let title, body, icon;
            
            if (completedPhase === 'pomodoro') {
                title = '🍅 Pomodoro Complete!';
                body = nextPhase === 'longBreak' 
                    ? 'Great work! Time for a long break (15 min).' 
                    : 'Good job! Time for a short break (5 min).';
                icon = './statIcon.png';
            } else if (completedPhase === 'shortBreak') {
                title = '☕ Short Break Complete!';
                body = 'Ready to focus again? Time for another Pomodoro!';
                icon = './settingsIcon.png';
            } else if (completedPhase === 'longBreak') {
                title = '🎉 Long Break Complete!';
                body = 'Refreshed and ready to go! Let\'s start another cycle!';
                icon = './settingsIcon.png';
            }
            
            const notification = new Notification(title, {
                body: body,
                icon: icon,
                badge: './statIcon.png',
                vibrate: [200, 100, 200],
                tag: 'pomodoro-timer',
                requireInteraction: true,
                silent: false
            });
            
            // Auto-close after 10 seconds if not interacted with
            setTimeout(() => notification.close(), 10000);
            
            // Focus app when notification is clicked
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            console.log('Direct notification shown');
        } catch (error) {
            console.error('Direct notification failed:', error);
        }
    }
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
        dailyData: {},  // { dateString: { pomodoros: 0, shortBreaks: 0, longBreaks: 0 } }
        dailyBreaks: {} // Backward compatibility, will be merged into dailyData
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
        
        // Support both old format (number) and new format (object)
        const dayData = dailyData[dateStr];
        let pomodoros = 0, shortBreaks = 0, longBreaks = 0;
        
        if (typeof dayData === 'number') {
            // Old format: just pomodoro count
            pomodoros = dayData;
        } else if (dayData && typeof dayData === 'object') {
            // New format: object with breakdown
            pomodoros = dayData.pomodoros || 0;
            shortBreaks = dayData.shortBreaks || 0;
            longBreaks = dayData.longBreaks || 0;
        }
        
        last7Days.push({
            date: date,
            dateStr: dateStr,
            pomodoros: pomodoros,
            shortBreaks: shortBreaks,
            longBreaks: longBreaks,
            total: pomodoros + shortBreaks + longBreaks,
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
    const paddingBottom = 45; // More space for day labels and legend
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding - paddingBottom;
    const maxValue = Math.max(1, ...last7Days.map(d => d.total));
    
    // Draw grid lines (no Y-axis labels)
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
        const y = padding + (chartHeight / gridLines) * i;
        
        // Draw grid line
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Colors for each type
    const colors = {
        pomodoro: '#3179b8',      // Blue for Pomodoros
        shortBreak: '#2a6199',    // Darker Blue for Short Breaks
        longBreak: '#22487a'      // Navy for Long Breaks
    };
    
    // Store bar positions for tap detection
    const barPositions = [];
    
    // Draw stacked bars
    const barWidth = chartWidth / last7Days.length;
    last7Days.forEach((day, index) => {
        const x = padding + index * barWidth;
        const barPadding = 5;
        const actualBarWidth = barWidth - (barPadding * 2);
        
        // Calculate heights for each segment
        const pomodoroHeight = day.total > 0 ? (day.pomodoros / maxValue) * chartHeight : 0;
        const shortBreakHeight = day.total > 0 ? (day.shortBreaks / maxValue) * chartHeight : 0;
        const longBreakHeight = day.total > 0 ? (day.longBreaks / maxValue) * chartHeight : 0;
        
        // Start from bottom of chart
        let currentY = padding + chartHeight;
        
        // Store bar position and data for click detection
        barPositions.push({
            x: x + barPadding,
            y: padding,
            width: actualBarWidth,
            height: chartHeight,
            day: day
        });
        
        // Draw Long Breaks (bottom layer)
        if (day.longBreaks > 0) {
            currentY -= longBreakHeight;
            ctx.fillStyle = colors.longBreak;
            ctx.fillRect(x + barPadding, currentY, actualBarWidth, longBreakHeight);
        }
        
        // Draw Short Breaks (middle layer)
        if (day.shortBreaks > 0) {
            currentY -= shortBreakHeight;
            ctx.fillStyle = colors.shortBreak;
            ctx.fillRect(x + barPadding, currentY, actualBarWidth, shortBreakHeight);
        }
        
        // Draw Pomodoros (top layer)
        if (day.pomodoros > 0) {
            currentY -= pomodoroHeight;
            ctx.fillStyle = colors.pomodoro;
            ctx.fillRect(x + barPadding, currentY, actualBarWidth, pomodoroHeight);
        }
        
        // Draw total count label on top of bar
        if (day.total > 0) {
            ctx.fillStyle = '#3179b8';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(day.total, x + barWidth / 2, currentY - 5);
        }
        
        // Draw day labels at bottom (below chart area)
        ctx.fillStyle = '#666';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(day.dayName, x + barWidth / 2, padding + chartHeight + 15);
    });
    
    // Draw legend below the day labels - larger and more visible
    const legendY = padding + chartHeight + 28;
    const legendStartX = (width - 220) / 2; // Center the legend
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'left';
    
    // Pomodoros
    ctx.fillStyle = colors.pomodoro;
    ctx.fillRect(legendStartX, legendY, 16, 16);
    ctx.fillStyle = '#333';
    ctx.fillText('Pomodoros', legendStartX + 22, legendY + 12);
    
    // Short Breaks
    ctx.fillStyle = colors.shortBreak;
    ctx.fillRect(legendStartX + 95, legendY, 16, 16);
    ctx.fillStyle = '#333';
    ctx.fillText('Short', legendStartX + 117, legendY + 12);
    
    // Long Breaks
    ctx.fillStyle = colors.longBreak;
    ctx.fillRect(legendStartX + 160, legendY, 16, 16);
    ctx.fillStyle = '#333';
    ctx.fillText('Long', legendStartX + 182, legendY + 12);
    
    // Store bar positions globally for click handling
    canvas.dataset.barPositions = JSON.stringify(barPositions);
}

function trackPomodoroComplete() {
    const analytics = loadAnalytics();
    analytics.totalPomodoros++;
    analytics.todayPomodoros++;
    analytics.totalTime += TIMES.pomodoro;
    
    // Track daily data for charts (new object format)
    const today = new Date().toDateString();
    if (!analytics.dailyData) analytics.dailyData = {};
    
    // Initialize day data if needed
    if (!analytics.dailyData[today]) {
        analytics.dailyData[today] = { pomodoros: 0, shortBreaks: 0, longBreaks: 0 };
    } else if (typeof analytics.dailyData[today] === 'number') {
        // Convert old format to new format
        const oldCount = analytics.dailyData[today];
        analytics.dailyData[today] = { pomodoros: oldCount, shortBreaks: 0, longBreaks: 0 };
    }
    
    analytics.dailyData[today].pomodoros++;
    
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

function trackBreakComplete(breakType) {
    const analytics = loadAnalytics();
    
    // Track daily data for charts
    const today = new Date().toDateString();
    if (!analytics.dailyData) analytics.dailyData = {};
    
    // Initialize day data if needed
    if (!analytics.dailyData[today]) {
        analytics.dailyData[today] = { pomodoros: 0, shortBreaks: 0, longBreaks: 0 };
    } else if (typeof analytics.dailyData[today] === 'number') {
        // Convert old format to new format
        const oldCount = analytics.dailyData[today];
        analytics.dailyData[today] = { pomodoros: oldCount, shortBreaks: 0, longBreaks: 0 };
    }
    
    if (breakType === 'shortBreak') {
        analytics.dailyData[today].shortBreaks++;
    } else if (breakType === 'longBreak') {
        analytics.dailyData[today].longBreaks++;
    }
    
    saveAnalytics(analytics);
    updateAnalyticsDisplay();
    drawChart();
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

// Handle chart bar clicks to show detailed breakdown
function handleChartClick(event) {
    const canvas = document.getElementById('stats-chart');
    if (!canvas || !canvas.dataset.barPositions) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const barPositions = JSON.parse(canvas.dataset.barPositions);
    
    // Check if click is on any bar
    for (const bar of barPositions) {
        if (x >= bar.x && x <= bar.x + bar.width && 
            y >= bar.y && y <= bar.y + bar.height) {
            showBarDetails(bar.day, event.clientX, event.clientY);
            return;
        }
    }
    
    // Click outside bars, hide tooltip
    hideBarDetails();
}

// Show detailed breakdown tooltip
function showBarDetails(day, mouseX, mouseY) {
    // Remove existing tooltip
    hideBarDetails();
    
    if (day.total === 0) return; // Don't show for empty days
    
    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'chart-tooltip';
    tooltip.className = 'chart-tooltip';
    
    tooltip.innerHTML = `
        <div class="tooltip-header">${day.dayName}</div>
        <div class="tooltip-row">
            <span class="tooltip-color" style="background: #3179b8;"></span>
            <span class="tooltip-label">Pomodoros:</span>
            <span class="tooltip-value">${day.pomodoros}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-color" style="background: #2a6199;"></span>
            <span class="tooltip-label">Short Breaks:</span>
            <span class="tooltip-value">${day.shortBreaks}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-color" style="background: #22487a;"></span>
            <span class="tooltip-label">Long Breaks:</span>
            <span class="tooltip-value">${day.longBreaks}</span>
        </div>
        <div class="tooltip-total">Total: ${day.total}</div>
    `;
    
    document.body.appendChild(tooltip);
    
    // Position tooltip near click point
    const tooltipRect = tooltip.getBoundingClientRect();
    let left = mouseX + 10;
    let top = mouseY - tooltipRect.height / 2;
    
    // Keep tooltip on screen
    if (left + tooltipRect.width > window.innerWidth) {
        left = mouseX - tooltipRect.width - 10;
    }
    if (top < 0) top = 10;
    if (top + tooltipRect.height > window.innerHeight) {
        top = window.innerHeight - tooltipRect.height - 10;
    }
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

// Hide tooltip
function hideBarDetails() {
    const tooltip = document.getElementById('chart-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

// Add chart click listener
const statsChart = document.getElementById('stats-chart');
if (statsChart) {
    statsChart.addEventListener('click', handleChartClick);
    statsChart.style.cursor = 'pointer';
}

// Hide tooltip when clicking outside or scrolling
document.addEventListener('click', (e) => {
    if (!e.target.closest('#stats-chart') && !e.target.closest('.chart-tooltip')) {
        hideBarDetails();
    }
});

document.addEventListener('scroll', hideBarDetails, true);

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
// Try to restore timer state first (in case user closed and reopened app)
const wasRestored = restoreTimerState();

if (!wasRestored) {
    // No saved state, start fresh
    setPhase('pomodoro');
}

updateAnalyticsDisplay();
updateSessionStats();

// Register Service Worker for background support and notifications
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('./service-worker.js');
            console.log('Service Worker registered successfully:', registration.scope);
            
            // Request notification permission
            if ('Notification' in window && Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                console.log('Notification permission:', permission);
            }
        } catch (error) {
            console.log('Service Worker registration failed:', error);
        }
        
        // Initialize Supabase
        if (window.SupabaseIntegration) {
            const initialized = await window.SupabaseIntegration.init();
            if (initialized) {
                console.log('Supabase integration ready');
            } else {
                console.log('Supabase integration not available - using local storage only');
            }
        }
    });
} else {
    // Fallback if Service Worker not supported
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
}

// Handle visibility change to re-request wake lock and sync timer
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
        // Page is visible again
        console.log('App returned to foreground');
        
        // Check if timer state needs to be synced
        const saved = localStorage.getItem('timerState');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                
                if (state.isRunning && state.targetEndTime) {
                    const now = Date.now();
                    const remainingMs = state.targetEndTime - now;
                    
                    if (remainingMs > 0) {
                        // Update display with actual remaining time
                        timeRemaining = Math.ceil(remainingMs / 1000);
                        updateDisplay();
                        updateProgressBar();
                        console.log('Timer synced:', timeRemaining, 'seconds remaining');
                    } else if (remainingMs <= 0 && isRunning) {
                        // Timer ended while in background
                        console.log('Timer ended in background, completing phase');
                        clearInterval(timerInterval);
                        isRunning = false;
                        timeRemaining = 0;
                        targetEndTime = null;
                        clearTimerState();
                        handlePhaseEnd();
                    }
                }
            } catch (error) {
                console.error('Error syncing timer:', error);
            }
        }
        
        // Re-request wake lock if needed
        if (isRunning && !wakeLock) {
            requestWakeLock();
        }
    }
});