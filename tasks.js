// Tasks Management for Ririnedoro Timer

let tasks = [];
let selectedTaskId = null;
let selectedTaskPomodoros = 0; // Track completed pomodoros for selected task
let expandedTasks = {}; // Track which tasks have expanded details

// DOM Elements
const tasksPanel = document.getElementById('tasks-panel');
const addTaskTrigger = document.getElementById('add-task-trigger');
const addTaskModal = document.getElementById('add-task-modal');
const cancelTaskBtn = document.getElementById('cancel-task-btn');
const addTaskBtn = document.getElementById('add-task-btn');
const taskTitleInput = document.getElementById('task-title');
const taskPomodorosInput = document.getElementById('task-pomodoros');
const taskDueDateInput = document.getElementById('task-due-date');
const taskPrioritySelect = document.getElementById('task-priority');
const tasksList = document.getElementById('tasks-list');
const appTitle = document.getElementById('app-title');
const taskProgress = document.getElementById('task-progress');
const taskDetailsContainer = document.getElementById('task-details');

// Toggle add task modal
function toggleAddTaskModal() {
    addTaskModal.classList.toggle('hidden');
    if (!addTaskModal.classList.contains('hidden')) {
        taskTitleInput.focus();
    }
}

// Close add task modal
function closeAddTaskModal() {
    addTaskModal.classList.add('hidden');
    // Clear form
    taskTitleInput.value = '';
    taskPomodorosInput.value = '1';
    taskDueDateInput.value = '';
    taskPrioritySelect.value = 'medium';
}

// Load tasks from Supabase
async function loadTasksFromSupabase() {
    if (!window.supabaseClient) {
        loadTasksFromLocal();
        return;
    }
    
    try {
        const deviceId = localStorage.getItem('deviceId');
        if (!deviceId) return;
        
        const { data, error } = await window.supabaseClient
            .from('tasks')
            .select('*')
            .eq('user_id', deviceId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        tasks = data || [];
        displayTasks();
    } catch (error) {
        console.error('Error loading tasks:', error);
        loadTasksFromLocal();
    }
}

// Load tasks from local storage
function loadTasksFromLocal() {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
        displayTasks();
    }
}

// Save tasks to Supabase
async function saveTaskToSupabase(task) {
    if (!window.supabaseClient) {
        console.log('Supabase client not available, saving to local storage only');
        saveTasksToLocal();
        return;
    }
    
    try {
        // Generate or get device ID
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', deviceId);
        }
        
        console.log('Saving task to Supabase with device ID:', deviceId);
        
        const { data, error } = await window.supabaseClient
            .from('tasks')
            .insert({
                user_id: deviceId,
                title: task.title,
                pomodoros: task.pomodoros,
                due_date: task.due_date,
                priority: task.priority,
                completed: task.completed
            })
            .select();
        
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        if (data && data.length > 0) {
            task.id = data[0].id;
            console.log('Task saved to Supabase with ID:', task.id);
        }
        
        saveTasksToLocal();
    } catch (error) {
        console.error('Error saving task to Supabase:', error);
        console.log('Falling back to local storage');
        saveTasksToLocal();
    }
}

// Update task in Supabase
async function updateTaskInSupabase(task) {
    if (!window.supabaseClient) {
        console.log('Supabase client not available, saving to local storage only');
        saveTasksToLocal();
        return;
    }
    
    try {
        console.log('Updating task in Supabase:', task.id);
        const { error } = await window.supabaseClient
            .from('tasks')
            .update({
                completed: task.completed
            })
            .eq('id', task.id);
        
        if (error) {
            console.error('Supabase update error:', error);
            throw error;
        }
        console.log('Task updated successfully');
        saveTasksToLocal();
    } catch (error) {
        console.error('Error updating task:', error);
        saveTasksToLocal();
    }
}

// Delete task from Supabase
async function deleteTaskFromSupabase(taskId) {
    if (!window.supabaseClient) {
        console.log('Supabase client not available, saving to local storage only');
        saveTasksToLocal();
        return;
    }
    
    try {
        console.log('Deleting task from Supabase:', taskId);
        const { error } = await window.supabaseClient
            .from('tasks')
            .delete()
            .eq('id', taskId);
        
        if (error) {
            console.error('Supabase delete error:', error);
            throw error;
        }
        console.log('Task deleted successfully');
        saveTasksToLocal();
    } catch (error) {
        console.error('Error deleting task:', error);
        saveTasksToLocal();
    }
}

// Save tasks to local storage
function saveTasksToLocal() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Add new task
async function addTask() {
    const title = taskTitleInput.value.trim();
    if (!title) return;
    
    const task = {
        id: 'task_' + Date.now(),
        title: title,
        pomodoros: parseInt(taskPomodorosInput.value) || 1,
        due_date: taskDueDateInput.value || null,
        priority: taskPrioritySelect.value,
        completed: false,
        created_at: new Date().toISOString()
    };
    
    tasks.push(task);
    displayTasks();
    saveTaskToSupabase(task);
    
    // Close modal and clear form
    closeAddTaskModal();
}

// Display task details below the timer
function displayTaskDetails() {
    if (!taskDetailsContainer) return;
    
    if (!selectedTaskId) {
        taskDetailsContainer.classList.add('hidden');
        return;
    }
    
    const task = tasks.find(t => t.id === selectedTaskId);
    if (!task) {
        taskDetailsContainer.classList.add('hidden');
        return;
    }
    
    taskDetailsContainer.classList.remove('hidden');
    
    let html = '';
    
    // Priority
    html += `<div class="task-details-item">
        <span class="task-details-label">Priority:</span>
        <span class="task-priority-badge ${task.priority}">${task.priority.toUpperCase()}</span>
    </div>`;
    
    // Pomodoros
    html += `<div class="task-details-item">
        <span class="task-details-label">Pomodoros:</span>
        <span>${task.pomodoros || 1}</span>
    </div>`;
    
    // Due Date
    if (task.due_date) {
        const dueDate = new Date(task.due_date);
        const now = new Date();
        const diffTime = dueDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let dueDateText = '';
        if (diffDays < 0) {
            dueDateText = `Overdue ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
        } else if (diffDays === 0) {
            dueDateText = 'Due today';
        } else if (diffDays === 1) {
            dueDateText = 'Due tomorrow';
        } else {
            dueDateText = `Due in ${diffDays} days`;
        }
        
        html += `<div class="task-details-item">
            <span class="task-details-label">Due Date:</span>
            <span>${dueDateText}</span>
        </div>`;
    }
    
    taskDetailsContainer.innerHTML = html;
}

// Select task for Pomodoro
function selectTask(taskId) {
    selectedTaskId = taskId;
    resetTaskProgress(); // Reset pomodoro count when selecting a task
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        appTitle.textContent = task.title.toUpperCase();
        updateTaskProgress();
        taskProgress.classList.remove('hidden');
        displayTaskDetails();
    }
    displayTasks();
}

// Deselect task
function deselectTask() {
    selectedTaskId = null;
    resetTaskProgress();
    appTitle.textContent = 'Ririnedoro';
    taskProgress.classList.add('hidden');
    if (taskDetailsContainer) {
        taskDetailsContainer.classList.add('hidden');
    }
    displayTasks();
}

// Update task progress display
function updateTaskProgress() {
    const task = tasks.find(t => t.id === selectedTaskId);
    if (task) {
        taskProgress.textContent = `${selectedTaskPomodoros}/${task.pomodoros}`;
        // Also update the task details display if it's visible
        displayTaskDetails();
    }
}

// Increment pomodoro count for selected task
function incrementTaskPomodoro() {
    if (selectedTaskId) {
        selectedTaskPomodoros++;
        updateTaskProgress();
        localStorage.setItem('selectedTaskProgress', selectedTaskPomodoros);
        saveTasksToLocal(); // Save to update selectedTaskPomodoros
    }
}

// Reset pomodoro count when task changes
function resetTaskProgress() {
    selectedTaskPomodoros = 0;
    localStorage.setItem('selectedTaskProgress', 0);
    updateTaskProgress();
}

// Mark task as complete
async function markTaskComplete() {
    if (!selectedTaskId) return;
    
    const task = tasks.find(t => t.id === selectedTaskId);
    if (task) {
        task.completed = true;
        await toggleTask(selectedTaskId);
        deselectTask();
        displayTasks();
    }
}

// Get currently selected task
function getSelectedTask() {
    return tasks.find(t => t.id === selectedTaskId);
}

// Make functions available globally
window.incrementTaskPomodoro = incrementTaskPomodoro;
window.markTaskComplete = markTaskComplete;

// Toggle task completion
async function toggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    task.completed = !task.completed;
    displayTasks();
    
    if (task.id && task.id.startsWith('task_')) {
        updateTaskInSupabase(task);
    } else {
        saveTasksToLocal();
    }
}

// Delete task
async function deleteTask(taskId) {
    if (confirm('Delete this task?')) {
        tasks = tasks.filter(t => t.id !== taskId);
        displayTasks();
        
        if (taskId && !taskId.startsWith('task_')) {
            deleteTaskFromSupabase(taskId);
        } else {
            saveTasksToLocal();
        }
    }
}

// Toggle task details expand/collapse
function toggleTaskDetails(taskId) {
    if (expandedTasks[taskId]) {
        expandedTasks[taskId] = false;
    } else {
        expandedTasks[taskId] = true;
    }
    
    // Re-render to update the display with animation
    displayTasks();
}

// Display tasks
function displayTasks() {
    tasksList.innerHTML = '';
    
    if (tasks.length === 0) {
        tasksList.innerHTML = '<p style="text-align: center; color: rgba(255, 255, 255, 0.7); padding: 20px;">No tasks yet. Add one above!</p>';
        return;
    }
    
    tasks.forEach(task => {
        const isExpanded = expandedTasks[task.id];
        
        const taskDiv = document.createElement('div');
        taskDiv.className = `task-item ${task.completed ? 'completed' : ''} ${task.priority} ${isExpanded ? 'expanded' : ''}`;
        
        // Task header (always visible)
        const taskHeader = document.createElement('div');
        taskHeader.className = 'task-header';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => toggleTask(task.id));
        
        const titleAndDate = document.createElement('div');
        titleAndDate.className = 'task-title-date';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = `task-title ${task.completed ? 'completed' : ''}`;
        titleDiv.textContent = task.title;
        
        const dueDateDiv = document.createElement('div');
        dueDateDiv.className = 'task-due-date';
        
        if (task.due_date) {
            const dueDate = new Date(task.due_date);
            const now = new Date();
            const diffTime = dueDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
                dueDateDiv.textContent = `Overdue ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
                dueDateDiv.style.color = '#ff6b6b';
            } else if (diffDays === 0) {
                dueDateDiv.textContent = 'Due today';
                dueDateDiv.style.color = '#ffa500';
            } else if (diffDays === 1) {
                dueDateDiv.textContent = 'Due tomorrow';
                dueDateDiv.style.color = 'white';
            } else {
                dueDateDiv.textContent = `Due in ${diffDays} days`;
                dueDateDiv.style.color = 'white';
            }
        } else {
            dueDateDiv.style.display = 'none';
        }
        
        titleAndDate.appendChild(titleDiv);
        titleAndDate.appendChild(dueDateDiv);
        
        taskHeader.appendChild(checkbox);
        taskHeader.appendChild(titleAndDate);
        
        // Task details (expandable)
        const taskDetails = document.createElement('div');
        taskDetails.className = 'task-details';
        
        // Add closed class if not expanded
        if (!isExpanded) {
            taskDetails.classList.add('closed');
        } else {
            taskDetails.classList.remove('closed');
        }
        
        const detailsContent = document.createElement('div');
        detailsContent.className = 'task-details-content';
        
        const priorityBadge = document.createElement('span');
        priorityBadge.className = `task-priority-badge ${task.priority}`;
        priorityBadge.textContent = task.priority.toUpperCase();
        
        const pomodoroBadge = document.createElement('span');
        pomodoroBadge.className = 'task-pomodoros-badge';
        pomodoroBadge.textContent = `${task.pomodoros || 1} pomodoro${(task.pomodoros || 1) === 1 ? '' : 's'}`;
        
        detailsContent.appendChild(priorityBadge);
        detailsContent.appendChild(pomodoroBadge);
        taskDetails.appendChild(detailsContent);
        
        // Add delete button to details section
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'delete-task-btn';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.id);
        });
        
        taskDetails.appendChild(deleteBtn);
        
        taskDiv.appendChild(taskHeader);
        taskDiv.appendChild(taskDetails);
        
        // Toggle expansion on click (excluding checkbox and delete button)
        taskHeader.addEventListener('click', (e) => {
            if (!task.completed && !e.target.classList.contains('task-checkbox') && e.target.tagName !== 'INPUT') {
                e.stopPropagation();
                
                // Toggle expansion only
                const currentState = expandedTasks[task.id] || false;
                const newExpandedState = !currentState;
                expandedTasks[task.id] = newExpandedState;
                
                // Use requestAnimationFrame to ensure smooth animation
                requestAnimationFrame(() => {
                    if (newExpandedState) {
                        taskDetails.classList.remove('closed');
                    } else {
                        taskDetails.classList.add('closed');
                    }
                });
            }
        });
        
        tasksList.appendChild(taskDiv);
    });
}

// Event listeners
addTaskTrigger.addEventListener('click', toggleAddTaskModal);
addTaskBtn.addEventListener('click', addTask);
cancelTaskBtn.addEventListener('click', closeAddTaskModal);

taskTitleInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

// Export functions for use in main script
window.TasksManager = {
    getSelectedTask,
    selectTask,
    deselectTask,
    incrementTaskPomodoro,
    loadTasksFromSupabase,
    loadTasksFromLocal
};

// Generate device ID if not exists
if (!localStorage.getItem('deviceId')) {
    const deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('deviceId', deviceId);
    console.log('Generated new device ID:', deviceId);
}

// Load tasks on page load
loadTasksFromLocal();

// Try to load from Supabase when client is ready
function loadTasksWhenReady() {
    if (window.supabaseClient) {
        console.log('Loading tasks from Supabase...');
        loadTasksFromSupabase();
    } else {
        console.log('Supabase client not ready, using local storage');
    }
}

// Wait for Supabase to be ready, then load tasks
setTimeout(loadTasksWhenReady, 1000);
window.addEventListener('load', loadTasksWhenReady);

// Load saved pomodoro count
const savedProgress = localStorage.getItem('selectedTaskProgress');
if (savedProgress) {
    selectedTaskPomodoros = parseInt(savedProgress) || 0;
}

