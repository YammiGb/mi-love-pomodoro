# Tasks Feature Guide

## What's New

Your Pomodoro timer now has a full task management system! 🎉

### Key Features

1. **Task Creation**
   - Add tasks with title
   - Set pomodoro count needed (how many Pomodoros to complete the task)
   - Set due date (optional)
   - Set priority (Low, Medium, High)

2. **Task Selection**
   - Click any task to select it
   - The timer header changes to the task title
   - Shows how many pomodoros are needed
   - Selected task is highlighted in blue
   - Click again to deselect

3. **Task Management**
   - Mark tasks as complete
   - Delete tasks
   - Visual priority indicators (red for high, blue for medium, gray for low)
   - Due date tracking with overdue warnings

4. **Database Integration**
   - Saves tasks to Supabase
   - Falls back to localStorage if Supabase unavailable
   - Syncs across sessions

### How to Use

1. Click the **✓ button** (checkmark icon) to open tasks panel
2. Fill in task details:
   - Task title (required)
   - Pomodoros needed (default: 1)
   - Due date (optional)
   - Priority
3. Click "Add Task"
4. Click a task to select it for your current Pomodoro session
5. The app title changes to your task name
6. Complete your Pomodoros and track progress

### Visual Indicators

- **Priority Colors**: Red (high), Blue (medium), Gray (low)
- **Selected Task**: Highlighted in light blue with thicker border
- **Completed Tasks**: Dimmed with green border
- **Pomodoro Badge**: Shows how many pomodoros the task needs
- **Due Date**: Shows countdown, overdue warnings in red

### Database Schema

Added to `supabase_schema.sql`:
- `pomodoros` field in tasks table
- Anonymous access policies
- Indexes for performance

### Next Steps

1. Run the updated `supabase_schema.sql` in Supabase to add the pomodoros field
2. Start using tasks to organize your work!

Enjoy your task-focused Pomodoro sessions! 🍅

