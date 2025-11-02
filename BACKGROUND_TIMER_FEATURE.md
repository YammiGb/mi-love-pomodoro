# Background Timer Feature

## Overview

The Rirenedoro Timer now supports **background operation**, allowing the timer to continue running even when:
- You switch to another app on your phone
- The browser is minimized or in the background
- The screen is locked (on most devices)
- You close and reopen the app

## How It Works

### 1. **Timestamp-Based Timing**
Instead of just counting down seconds, the timer now:
- Stores the exact timestamp when the timer should end
- Calculates remaining time based on actual elapsed time
- Stays accurate even if the browser is paused

### 2. **State Persistence**
The timer automatically saves its state to localStorage:
- Current phase (Pomodoro/Break)
- Time remaining
- Whether it's running or paused
- Target end time

### 3. **Automatic Recovery**
When you return to the app:
- The timer checks how much time has actually passed
- Updates the display to show the correct remaining time
- If the timer ended while you were gone, it completes the phase automatically
- Resumes running automatically if it was running before

### 4. **Service Worker (PWA)**
A service worker enables:
- Background notifications when timer completes
- Offline support (app works without internet)
- Faster loading from cache
- Install as app on mobile devices

## Features

### ✅ Works in Background
- Timer keeps running when you switch apps
- Accurate timing even after hours in background
- No need to keep the app open

### ✅ Smart Recovery
- Automatically detects when you return
- Shows correct time based on actual elapsed time
- Completes phases that ended while away

### ✅ Notifications
- Get notified when timer completes (requires permission)
- Works even if app is in background
- Customized messages for each phase

### ✅ Progressive Web App
- Install on home screen (mobile)
- Works offline after first load
- Feels like a native app

## How to Use

### On Mobile (Recommended)

1. **Install as App** (optional but recommended):
   - Open in Chrome/Safari on your phone
   - Tap "Add to Home Screen" or "Install"
   - Open from your home screen like any app

2. **Grant Notification Permission**:
   - When prompted, allow notifications
   - You'll get alerts when timer completes

3. **Start a Timer**:
   - Set your Pomodoro and start
   - Switch to other apps freely
   - Return anytime to check progress

4. **Background Operation**:
   - Timer continues in background
   - Get notified when it completes
   - Return to app to start next phase

### On Desktop

1. **Open in Browser**:
   - Use Chrome, Edge, or Firefox (Safari has limitations)

2. **Allow Notifications**:
   - Click "Allow" when prompted
   - Desktop notifications will appear

3. **Use Normally**:
   - Switch tabs or minimize browser
   - Timer keeps running
   - Get notified on completion

## Technical Details

### Browser Support

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| Background Timer | ✅ | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Notifications | ✅ | ⚠️ Limited | ✅ | ✅ |
| PWA Install | ✅ | ✅ iOS | ✅ | ✅ |

⚠️ **Safari Note**: iOS Safari has restrictions on background tasks. The timer will work, but notifications may be delayed until you reopen the app.

### How Accuracy is Maintained

1. **Timestamp Storage**:
   ```javascript
   targetEndTime = Date.now() + (timeRemaining * 1000);
   ```
   This stores exactly when the timer should end.

2. **Real-Time Calculation**:
   ```javascript
   timeRemaining = Math.ceil((targetEndTime - Date.now()) / 1000);
   ```
   Every second, we calculate based on the actual current time.

3. **Visibility API**:
   - Detects when you return to the app
   - Immediately syncs to correct time
   - Handles missed completions

### State Saved

The following state is automatically saved:
- `currentPhase`: 'pomodoro', 'shortBreak', or 'longBreak'
- `timeRemaining`: Seconds left
- `isRunning`: Whether timer is active
- `targetEndTime`: Exact completion timestamp
- `pomodorosCompleted`: Session count

## Troubleshooting

### Timer Not Running in Background?

**Check:**
1. Notifications are enabled
2. Battery saver mode is off (can pause background processes)
3. Browser has permission to run in background
4. Service worker is registered (check console)

**iOS Specific:**
- iOS limits background web app execution
- Keep app open or use frequent app switches
- Consider using "Keep screen on" accessibility setting

### Notifications Not Showing?

**Desktop:**
1. Check browser notification settings
2. Allow site notifications in system settings
3. Make sure browser is not in "Do Not Disturb" mode

**Mobile:**
1. Grant notification permission when prompted
2. Check phone's notification settings
3. Ensure app notifications are enabled in system

### Timer Jumped/Skipped?

This is **expected behavior**:
- If the timer completed while you were away
- The app automatically handles the completion
- Shows the next phase when you return

To avoid:
- Check the timer before leaving
- Enable notifications to know when it completes

## Limitations

1. **iOS Background Limits**:
   - iOS restricts background web apps
   - May pause after ~30 seconds in background
   - Notifications may be delayed

2. **Battery Optimization**:
   - Aggressive battery savers may pause the app
   - Timer will resume when reopened

3. **Browser Restrictions**:
   - Some browsers limit background tab execution
   - Service workers may be killed after long periods

## Best Practices

1. **Enable Notifications**: Get alerts even when app is closed
2. **Install as PWA**: Better background support on mobile
3. **Check Before Leaving**: Verify timer started before switching apps
4. **Use Wake Lock**: Keeps screen on during sessions (already implemented)

## Future Enhancements

- [ ] Background audio playback for completion sound
- [ ] Persistent notifications that don't auto-dismiss
- [ ] Daily reminder notifications
- [ ] Statistics sync across devices in real-time
- [ ] Android/iOS native app versions

## Conclusion

The background timer feature makes Rirenedoro a true productivity tool that works **with** your workflow, not against it. Start a Pomodoro, switch to work in other apps, and let the timer handle the rest!

**Enjoy distraction-free productivity! 🍅**

