/**
 * TaskFlow - Tactile Neumorphic Task & Habit Tracker
 * Features:
 * - One-Time Tasks: Once completed, remain permanently completed (never renewed)
 * - Daily Tasks: Automatically renew (reset to uncompleted) every 12:00 AM Midnight
 * - Local User ID & Progress Persistence: Client-side storage (localStorage) without login or database
 */

(() => {
  // Storage Keys
  const STORAGE_KEY_TASKS = 'taskflow_tasks_v1';
  const STORAGE_KEY_THEME = 'taskflow_theme';
  const STORAGE_KEY_LAST_RESET = 'taskflow_last_reset_date';
  const STORAGE_KEY_USER_PROFILE = 'taskflow_user_profile_v1';

  // State
  let tasks = [];
  let currentFilter = 'all';
  let searchQuery = '';
  let selectedNewTaskType = 'daily';
  let selectedEditTaskType = 'daily';

  let userProfile = {
    userId: '',
    displayName: 'TaskFlow User',
    createdAt: '',
    stats: {
      totalCreated: 0,
      totalCompleted: 0,
      dailyStreakDays: 1,
      lastActiveDate: ''
    }
  };

  // DOM Elements - Navigation & Header
  const userProfileBtn = document.getElementById('userProfileBtn');
  const headerUserId = document.getElementById('headerUserId');
  const midnightCountdown = document.getElementById('midnightCountdown');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const currentDateDisplay = document.getElementById('currentDateDisplay');

  // Stats Dashboard
  const dailyTasksStat = document.getElementById('dailyTasksStat');
  const oneTimeTasksStat = document.getElementById('oneTimeTasksStat');
  const overallCompletionStat = document.getElementById('overallCompletionStat');

  // Create Task Form Elements
  const taskForm = document.getElementById('taskForm');
  const taskTitleInput = document.getElementById('taskTitleInput');
  const taskTagInput = document.getElementById('taskTagInput');
  const taskTimeInput = document.getElementById('taskTimeInput');
  const typeDailyBtn = document.getElementById('typeDailyBtn');
  const typeOneTimeBtn = document.getElementById('typeOneTimeBtn');

  // Task Display & Groups
  const dailyTaskList = document.getElementById('dailyTaskList');
  const oneTimeTaskList = document.getElementById('oneTimeTaskList');
  const dailySectionContainer = document.getElementById('dailySectionContainer');
  const oneTimeSectionContainer = document.getElementById('oneTimeSectionContainer');
  const emptyState = document.getElementById('emptyState');

  // Controls & Filters
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const filterTabs = document.querySelectorAll('.filter-tab');
  const simulateMidnightBtn = document.getElementById('simulateMidnightBtn');

  const dailyTabCount = document.getElementById('dailyTabCount');
  const oneTimeTabCount = document.getElementById('oneTimeTabCount');
  const dailyCounterBadge = document.getElementById('dailyCounterBadge');
  const oneTimeCounterBadge = document.getElementById('oneTimeCounterBadge');

  // Edit Modal Elements
  const editModal = document.getElementById('editModal');
  const editTaskForm = document.getElementById('editTaskForm');
  const editTaskId = document.getElementById('editTaskId');
  const editTaskTitleInput = document.getElementById('editTaskTitleInput');
  const editTaskTagInput = document.getElementById('editTaskTagInput');
  const editTaskTimeInput = document.getElementById('editTaskTimeInput');
  const editTypeDailyBtn = document.getElementById('editTypeDailyBtn');
  const editTypeOneTimeBtn = document.getElementById('editTypeOneTimeBtn');
  const closeEditModalBtn = document.getElementById('closeEditModalBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');

  // User Profile & Progress Modal Elements
  const profileModal = document.getElementById('profileModal');
  const closeProfileModalBtn = document.getElementById('closeProfileModalBtn');
  const profileUserIdDisplay = document.getElementById('profileUserIdDisplay');
  const copyUserIdBtn = document.getElementById('copyUserIdBtn');
  const copyIdIcon = document.getElementById('copyIdIcon');
  const copyIdBtnText = document.getElementById('copyIdBtnText');
  const statAllTimeCompleted = document.getElementById('statAllTimeCompleted');
  const statDailyStreak = document.getElementById('statDailyStreak');
  const statTotalCreated = document.getElementById('statTotalCreated');
  const statMemberSince = document.getElementById('statMemberSince');
  const profileDisplayNameInput = document.getElementById('profileDisplayNameInput');
  const saveProfileNameBtn = document.getElementById('saveProfileNameBtn');
  const exportDataBtn = document.getElementById('exportDataBtn');
  const importDataBtn = document.getElementById('importDataBtn');
  const importFileInput = document.getElementById('importFileInput');
  const resetUserBtn = document.getElementById('resetUserBtn');

  // Toast Container
  const toastContainer = document.getElementById('toastContainer');

  /* ===================================================================
     Utility Functions
     =================================================================== */

  // Get current date string in local YYYY-MM-DD format
  function getLocalDateString(dateObj = new Date()) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Format date for footer and profile display
  function formatFriendlyDate(dateObj = new Date()) {
    if (isNaN(dateObj.getTime())) dateObj = new Date();
    return dateObj.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Generate Unique Task ID
  function generateId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  // Generate Unique User Profile ID (e.g. TF-8492-K39X)
  function generateUserId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let p1 = '', p2 = '';
    for (let i = 0; i < 4; i++) p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    for (let i = 0; i < 4; i++) p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    return `TF-${p1}-${p2}`;
  }

  // Sanitize text output for XSS prevention
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Show Tactile Toast Notification
  function showToast(message, type = 'info', iconName = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${escapeHTML(message)}</span>
    `;
    toastContainer.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  /* ===================================================================
     User Profile & Local Progress Persistence (No Login, No Database)
     =================================================================== */

  function loadUserProfile() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER_PROFILE);
      if (stored) {
        userProfile = JSON.parse(stored);
        // Ensure data integrity
        if (!userProfile.userId) userProfile.userId = generateUserId();
        if (!userProfile.stats) {
          userProfile.stats = { totalCreated: tasks.length, totalCompleted: 0, dailyStreakDays: 1, lastActiveDate: getLocalDateString() };
        }
      } else {
        userProfile = {
          userId: generateUserId(),
          displayName: 'TaskFlow User',
          createdAt: new Date().toISOString(),
          stats: {
            totalCreated: 5,
            totalCompleted: 2,
            dailyStreakDays: 1,
            lastActiveDate: getLocalDateString()
          }
        };
        saveUserProfile();
      }
    } catch (e) {
      console.error('Failed to load user profile from localStorage', e);
      userProfile = {
        userId: generateUserId(),
        displayName: 'TaskFlow User',
        createdAt: new Date().toISOString(),
        stats: { totalCreated: 0, totalCompleted: 0, dailyStreakDays: 1, lastActiveDate: getLocalDateString() }
      };
    }
    updateUserProfileUI();
  }

  function saveUserProfile() {
    try {
      localStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(userProfile));
    } catch (e) {
      console.error('Failed to save user profile to localStorage', e);
    }
    updateUserProfileUI();
  }

  function updateUserProfileUI() {
    if (headerUserId) {
      headerUserId.textContent = userProfile.userId;
    }
    if (profileUserIdDisplay) {
      profileUserIdDisplay.textContent = userProfile.userId;
    }
    if (statAllTimeCompleted) {
      statAllTimeCompleted.textContent = userProfile.stats.totalCompleted;
    }
    if (statDailyStreak) {
      const days = userProfile.stats.dailyStreakDays || 1;
      statDailyStreak.textContent = `${days} day${days === 1 ? '' : 's'}`;
    }
    if (statTotalCreated) {
      statTotalCreated.textContent = userProfile.stats.totalCreated;
    }
    if (statMemberSince) {
      const createdDate = userProfile.createdAt ? new Date(userProfile.createdAt) : new Date();
      statMemberSince.textContent = formatFriendlyDate(createdDate);
    }
    if (profileDisplayNameInput) {
      profileDisplayNameInput.value = userProfile.displayName || '';
    }
  }

  function openProfileModal() {
    updateUserProfileUI();
    profileModal.classList.remove('hidden');
    lucide.createIcons();
  }

  function closeProfileModal() {
    profileModal.classList.add('hidden');
  }

  function copyUserIdToClipboard() {
    const idToCopy = userProfile.userId;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(idToCopy).then(() => {
        handleCopyFeedback();
      }).catch(() => {
        fallbackCopyText(idToCopy);
      });
    } else {
      fallbackCopyText(idToCopy);
    }
  }

  function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      handleCopyFeedback();
    } catch (err) {
      showToast('Could not copy automatically. Your ID is: ' + text, 'info');
    }
    document.body.removeChild(textArea);
  }

  function handleCopyFeedback() {
    if (copyIdBtnText) copyIdBtnText.textContent = 'Copied!';
    if (copyIdIcon) copyIdIcon.setAttribute('data-lucide', 'check');
    lucide.createIcons();
    showToast(`User ID "${userProfile.userId}" copied to clipboard!`, 'success', 'copy');

    setTimeout(() => {
      if (copyIdBtnText) copyIdBtnText.textContent = 'Copy ID';
      if (copyIdIcon) copyIdIcon.setAttribute('data-lucide', 'copy');
      lucide.createIcons();
    }, 2500);
  }

  function saveProfileName() {
    const newName = profileDisplayNameInput.value.trim();
    if (!newName) {
      showToast('Please enter a valid display name', 'warning', 'alert-circle');
      return;
    }
    userProfile.displayName = newName;
    saveUserProfile();
    showToast(`Display name updated to "${newName}"`, 'success', 'user-check');
  }

  function exportUserData() {
    const exportPayload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      userProfile: userProfile,
      tasks: tasks,
      lastResetDate: localStorage.getItem(STORAGE_KEY_LAST_RESET)
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `TaskFlow_${userProfile.userId}_Backup_${getLocalDateString()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast('Progress and tasks backup exported successfully!', 'success', 'download');
  }

  function importUserData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.tasks && Array.isArray(imported.tasks)) {
          tasks = imported.tasks;
          saveTasks();
        }
        if (imported.userProfile) {
          userProfile = imported.userProfile;
          saveUserProfile();
        }
        if (imported.lastResetDate) {
          localStorage.setItem(STORAGE_KEY_LAST_RESET, imported.lastResetDate);
        }

        renderTasks();
        updateStats();
        updateUserProfileUI();
        closeProfileModal();
        showToast('Backup restored successfully!', 'success', 'check-circle-2');
      } catch (err) {
        showToast('Invalid backup file. Please provide a valid TaskFlow JSON file.', 'warning', 'alert-triangle');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset file input
  }

  function resetUserProfile() {
    if (confirm('Are you sure you want to generate a new User ID? Your previous local progress and tasks will be refreshed.')) {
      userProfile = {
        userId: generateUserId(),
        displayName: 'TaskFlow User',
        createdAt: new Date().toISOString(),
        stats: {
          totalCreated: 0,
          totalCompleted: 0,
          dailyStreakDays: 1,
          lastActiveDate: getLocalDateString()
        }
      };
      tasks = getSampleTasks();
      saveTasks();
      saveUserProfile();
      renderTasks();
      updateStats();
      updateUserProfileUI();
      closeProfileModal();
      showToast(`New profile generated: ${userProfile.userId}`, 'info', 'refresh-cw');
    }
  }

  /* ===================================================================
     Initial Sample Tasks
     =================================================================== */

  function getSampleTasks() {
    const today = getLocalDateString();
    return [
      {
        id: generateId(),
        title: 'Morning workout & stretching (20m)',
        type: 'daily',
        tag: 'Health',
        targetTime: '07:30',
        completed: false,
        completedDate: null,
        createdAt: new Date().toISOString()
      },
      {
        id: generateId(),
        title: 'Drink 2.5L of water throughout the day',
        type: 'daily',
        tag: 'Habit',
        targetTime: '18:00',
        completed: true,
        completedDate: today,
        createdAt: new Date().toISOString()
      },
      {
        id: generateId(),
        title: 'Read 15 pages of book',
        type: 'daily',
        tag: 'Learning',
        targetTime: '21:00',
        completed: false,
        completedDate: null,
        createdAt: new Date().toISOString()
      },
      {
        id: generateId(),
        title: 'Finalize project quarterly report',
        type: 'one-time',
        tag: 'Work',
        targetTime: '15:00',
        completed: false,
        completedDate: null,
        createdAt: new Date().toISOString()
      },
      {
        id: generateId(),
        title: 'Renew domain registration & SSL certificate',
        type: 'one-time',
        tag: 'Dev',
        targetTime: '',
        completed: true,
        completedDate: today,
        createdAt: new Date().toISOString()
      }
    ];
  }

  /* ===================================================================
     Persistence (localStorage)
     =================================================================== */

  function loadTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TASKS);
      if (stored) {
        tasks = JSON.parse(stored);
      } else {
        tasks = getSampleTasks();
        saveTasks();
      }
    } catch (e) {
      console.error('Failed to load tasks from localStorage', e);
      tasks = getSampleTasks();
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save tasks to localStorage', e);
    }
  }

  /* ===================================================================
     Midnight Renewal Engine (12:00 AM Daily Reset)
     =================================================================== */

  /**
   * CRITICAL REQUIREMENT:
   * - Daily tasks: automatically renewed (reset completed to false) every midnight (12:00 AM).
   * - One-time tasks: once completed, WILL NOT BE RENEWED. They remain completed permanently.
   */
  function checkAndResetDailyTasks(isSimulated = false) {
    const todayStr = getLocalDateString();
    const lastResetDate = localStorage.getItem(STORAGE_KEY_LAST_RESET);
    let resetCount = 0;

    tasks.forEach(task => {
      // ONLY process tasks of type 'daily'
      if (task.type === 'daily') {
        // If task is completed and the completion was from a previous date (or forced reset)
        if (task.completed) {
          if (isSimulated || task.completedDate !== todayStr || lastResetDate !== todayStr) {
            task.completed = false;
            task.completedDate = null;
            resetCount++;
          }
        }
      }
      // Note: One-time tasks (task.type === 'one-time') are STRICTLY IGNORED and left unchanged!
    });

    // Check streak rollover if entering a new date
    if (lastResetDate && lastResetDate !== todayStr && !isSimulated) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);
      if (userProfile.stats.lastActiveDate === yesterdayStr) {
        userProfile.stats.dailyStreakDays = (userProfile.stats.dailyStreakDays || 0) + 1;
      }
      userProfile.stats.lastActiveDate = todayStr;
      saveUserProfile();
    }

    localStorage.setItem(STORAGE_KEY_LAST_RESET, todayStr);

    if (resetCount > 0 || isSimulated) {
      saveTasks();
      renderTasks();
      updateStats();
      if (isSimulated) {
        showToast(`Midnight reset simulated! ${resetCount} daily task(s) renewed. One-time tasks preserved permanently.`, 'success', 'moon-star');
      } else if (resetCount > 0) {
        showToast(`12:00 AM Midnight Renewal: ${resetCount} daily habit(s) refreshed for today!`, 'info', 'repeat');
      }
    }
  }

  // Schedule exact timeout to next 12:00:00 AM Midnight
  function scheduleMidnightTimer() {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();

    setTimeout(() => {
      checkAndResetDailyTasks();
      // Schedule the next day's midnight timer
      scheduleMidnightTimer();
    }, msUntilMidnight + 50); // slight buffer to ensure clock crossed 00:00:00
  }

  // Real-time countdown to next 12:00 AM Midnight
  function updateMidnightCountdown() {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const diff = nextMidnight.getTime() - now.getTime();

    if (diff <= 1000) {
      // Clock just hit midnight!
      checkAndResetDailyTasks();
    }

    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    const pad = n => String(n).padStart(2, '0');
    if (midnightCountdown) {
      midnightCountdown.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
  }

  /* ===================================================================
     Task Operations (CRUD)
     =================================================================== */

  // Add Task
  function addTask(title, type, tag, targetTime) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const newTask = {
      id: generateId(),
      title: trimmedTitle,
      type: type || 'daily',
      tag: tag.trim() || '',
      targetTime: targetTime || '',
      completed: false,
      completedDate: null,
      createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    saveTasks();

    // Increment user profile total tasks created
    userProfile.stats.totalCreated = (userProfile.stats.totalCreated || 0) + 1;
    userProfile.stats.lastActiveDate = getLocalDateString();
    saveUserProfile();

    renderTasks();
    updateStats();

    const typeName = newTask.type === 'daily' ? 'Daily habit (renews midnight)' : 'One-time task';
    showToast(`Added: "${newTask.title}" as ${typeName}`, 'success', 'check');
  }

  // Toggle Completion
  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    if (task.completed) {
      task.completedDate = getLocalDateString();
      userProfile.stats.totalCompleted = (userProfile.stats.totalCompleted || 0) + 1;
      userProfile.stats.lastActiveDate = getLocalDateString();
      saveUserProfile();

      if (task.type === 'daily') {
        showToast(`Completed daily habit! (Will renew tonight at 12:00 AM)`, 'success', 'repeat');
      } else {
        showToast(`Completed one-time task! (Permanently done)`, 'success', 'check-circle-2');
      }
    } else {
      task.completedDate = null;
    }

    saveTasks();
    renderTasks();
    updateStats();
  }

  // Delete Task
  function deleteTask(id) {
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return;

    const [deleted] = tasks.splice(index, 1);
    saveTasks();
    renderTasks();
    updateStats();
    showToast(`Deleted "${deleted.title}"`, 'warning', 'trash-2');
  }

  // Open Edit Modal
  function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    editTaskId.value = task.id;
    editTaskTitleInput.value = task.title;
    editTaskTagInput.value = task.tag || '';
    editTaskTimeInput.value = task.targetTime || '';
    selectedEditTaskType = task.type || 'daily';

    updateEditTypePills();
    editModal.classList.remove('hidden');
    editTaskTitleInput.focus();
    lucide.createIcons();
  }

  // Close Edit Modal
  function closeEditModal() {
    editModal.classList.add('hidden');
  }

  // Save Edit
  function saveEditedTask() {
    const id = editTaskId.value;
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newTitle = editTaskTitleInput.value.trim();
    if (!newTitle) return;

    task.title = newTitle;
    task.type = selectedEditTaskType;
    task.tag = editTaskTagInput.value.trim();
    task.targetTime = editTaskTimeInput.value;

    saveTasks();
    closeEditModal();
    renderTasks();
    updateStats();
    showToast('Task updated successfully!', 'success', 'save');
  }

  /* ===================================================================
     Rendering & UI Updates
     =================================================================== */

  // Filter Tasks
  function getFilteredTasks() {
    return tasks.filter(task => {
      // Type / Status Filter
      if (currentFilter === 'daily' && task.type !== 'daily') return false;
      if (currentFilter === 'one-time' && task.type !== 'one-time') return false;
      if (currentFilter === 'active' && task.completed) return false;
      if (currentFilter === 'completed' && !task.completed) return false;

      // Search Query Filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(q);
        const tagMatch = task.tag ? task.tag.toLowerCase().includes(q) : false;
        return titleMatch || tagMatch;
      }

      return true;
    });
  }

  // Generate Task HTML Element
  function createTaskElement(task) {
    const item = document.createElement('div');
    item.className = `task-item ${task.completed ? 'completed' : ''}`;
    item.setAttribute('data-id', task.id);

    const isDaily = task.type === 'daily';

    const renewalBadge = isDaily
      ? `<span class="renewal-indicator" title="Automatically resets every midnight at 12:00 AM">
           <i data-lucide="moon-star"></i> Renews 12 AM
         </span>`
      : `<span class="task-type-badge one-time" title="Remains completed permanently">
           <i data-lucide="pin"></i> One-Time
         </span>`;

    const tagBadge = task.tag
      ? `<span class="task-tag"><i data-lucide="tag"></i>${escapeHTML(task.tag)}</span>`
      : '';

    const timeBadge = task.targetTime
      ? `<span class="task-time-badge"><i data-lucide="clock"></i>${task.targetTime}</span>`
      : '';

    item.innerHTML = `
      <div class="task-main">
        <button type="button" class="neu-checkbox" aria-label="Toggle task completed" data-action="toggle">
          <i data-lucide="check"></i>
        </button>
        <div class="task-details">
          <div class="task-title">${escapeHTML(task.title)}</div>
          <div class="task-meta">
            ${renewalBadge}
            ${tagBadge}
            ${timeBadge}
          </div>
        </div>
      </div>
      <div class="task-actions">
        <button type="button" class="task-action-btn edit-btn" aria-label="Edit task" data-action="edit" title="Edit task">
          <i data-lucide="edit-2"></i>
        </button>
        <button type="button" class="task-action-btn delete-btn" aria-label="Delete task" data-action="delete" title="Delete task">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;

    // Event listeners
    item.querySelector('[data-action="toggle"]').addEventListener('click', () => toggleTask(task.id));
    item.querySelector('[data-action="edit"]').addEventListener('click', () => openEditModal(task.id));
    item.querySelector('[data-action="delete"]').addEventListener('click', () => deleteTask(task.id));

    return item;
  }

  // Render all task lists
  function renderTasks() {
    const filtered = getFilteredTasks();
    const dailyTasks = filtered.filter(t => t.type === 'daily');
    const oneTimeTasks = filtered.filter(t => t.type === 'one-time');

    // Clear containers
    dailyTaskList.innerHTML = '';
    oneTimeTaskList.innerHTML = '';

    // Render Daily Tasks
    dailyTasks.forEach(task => {
      dailyTaskList.appendChild(createTaskElement(task));
    });

    // Render One-Time Tasks
    oneTimeTasks.forEach(task => {
      oneTimeTaskList.appendChild(createTaskElement(task));
    });

    // Handle container visibility based on filter and counts
    if (currentFilter === 'one-time') {
      dailySectionContainer.style.display = 'none';
      oneTimeSectionContainer.style.display = 'flex';
    } else if (currentFilter === 'daily') {
      dailySectionContainer.style.display = 'flex';
      oneTimeSectionContainer.style.display = 'none';
    } else {
      // 'all', 'active', 'completed'
      dailySectionContainer.style.display = dailyTasks.length > 0 ? 'flex' : 'none';
      oneTimeSectionContainer.style.display = oneTimeTasks.length > 0 ? 'flex' : 'none';
    }

    // Counters on group headers
    dailyCounterBadge.textContent = `${dailyTasks.length} task${dailyTasks.length === 1 ? '' : 's'}`;
    oneTimeCounterBadge.textContent = `${oneTimeTasks.length} task${oneTimeTasks.length === 1 ? '' : 's'}`;

    // Empty state
    if (filtered.length === 0) {
      emptyState.classList.remove('hidden');
      dailySectionContainer.style.display = 'none';
      oneTimeSectionContainer.style.display = 'none';
    } else {
      emptyState.classList.add('hidden');
    }

    // Render Lucide Icons
    lucide.createIcons();
  }

  // Update Summary Stats & Badges
  function updateStats() {
    const allDaily = tasks.filter(t => t.type === 'daily');
    const completedDaily = allDaily.filter(t => t.completed).length;

    const allOneTime = tasks.filter(t => t.type === 'one-time');
    const completedOneTime = allOneTime.filter(t => t.completed).length;

    const totalTasks = tasks.length;
    const totalCompleted = tasks.filter(t => t.completed).length;
    const totalPercent = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

    // Stats cards
    dailyTasksStat.textContent = `${completedDaily}/${allDaily.length}`;
    oneTimeTasksStat.textContent = `${completedOneTime}/${allOneTime.length}`;
    overallCompletionStat.textContent = `${totalPercent}%`;

    // Tab counts
    dailyTabCount.textContent = allDaily.length;
    oneTimeTabCount.textContent = allOneTime.length;
  }

  // Update Type selector pill active state in Create Form
  function updateCreateTypePills() {
    if (selectedNewTaskType === 'daily') {
      typeDailyBtn.classList.add('active');
      typeOneTimeBtn.classList.remove('active');
    } else {
      typeOneTimeBtn.classList.add('active');
      typeDailyBtn.classList.remove('active');
    }
  }

  // Update Type selector pill active state in Edit Modal
  function updateEditTypePills() {
    if (selectedEditTaskType === 'daily') {
      editTypeDailyBtn.classList.add('active');
      editTypeOneTimeBtn.classList.remove('active');
    } else {
      editTypeOneTimeBtn.classList.add('active');
      editTypeDailyBtn.classList.remove('active');
    }
  }

  /* ===================================================================
     Theme Management (Neumorphic Dark / Light)
     =================================================================== */

  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
      updateThemeIcon(true);
    } else {
      document.body.classList.remove('dark-mode');
      updateThemeIcon(false);
    }
  }

  function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem(STORAGE_KEY_THEME, isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
    lucide.createIcons();
  }

  function updateThemeIcon(isDark) {
    if (themeIcon) {
      themeIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    }
  }

  /* ===================================================================
     Event Handlers
     =================================================================== */

  function setupEventListeners() {
    // User Profile Modal Open / Close
    userProfileBtn.addEventListener('click', openProfileModal);
    closeProfileModalBtn.addEventListener('click', closeProfileModal);
    profileModal.addEventListener('click', (e) => {
      if (e.target === profileModal) closeProfileModal();
    });

    // Copy User ID
    copyUserIdBtn.addEventListener('click', copyUserIdToClipboard);

    // Save Profile Display Name
    saveProfileNameBtn.addEventListener('click', saveProfileName);

    // Backup / Export Data
    exportDataBtn.addEventListener('click', exportUserData);

    // Import Backup Data
    importDataBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importUserData);

    // Reset User ID / Profile
    resetUserBtn.addEventListener('click', resetUserProfile);

    // Add Task Form Submit
    taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      addTask(
        taskTitleInput.value,
        selectedNewTaskType,
        taskTagInput.value,
        taskTimeInput.value
      );
      taskTitleInput.value = '';
      taskTagInput.value = '';
      taskTimeInput.value = '';
      taskTitleInput.focus();
    });

    // Task Type Switchers (Create Form)
    typeDailyBtn.addEventListener('click', () => {
      selectedNewTaskType = 'daily';
      updateCreateTypePills();
    });
    typeOneTimeBtn.addEventListener('click', () => {
      selectedNewTaskType = 'one-time';
      updateCreateTypePills();
    });

    // Filter Tabs
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.getAttribute('data-filter');
        renderTasks();
      });
    });

    // Search Input
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      if (searchQuery.length > 0) {
        clearSearchBtn.classList.remove('hidden');
      } else {
        clearSearchBtn.classList.add('hidden');
      }
      renderTasks();
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.classList.add('hidden');
      renderTasks();
      searchInput.focus();
    });

    // Simulate Midnight Button (Demo / Testing helper)
    simulateMidnightBtn.addEventListener('click', () => {
      checkAndResetDailyTasks(true);
    });

    // Edit Modal Events
    editTypeDailyBtn.addEventListener('click', () => {
      selectedEditTaskType = 'daily';
      updateEditTypePills();
    });
    editTypeOneTimeBtn.addEventListener('click', () => {
      selectedEditTaskType = 'one-time';
      updateEditTypePills();
    });
    editTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveEditedTask();
    });
    closeEditModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeEditModal();
    });

    // Theme Toggle
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Escape key closes open modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!editModal.classList.contains('hidden')) closeEditModal();
        if (!profileModal.classList.contains('hidden')) closeProfileModal();
      }
    });

    // When tab gets focused / visible, check for midnight rollover
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checkAndResetDailyTasks();
      }
    });
    window.addEventListener('focus', () => {
      checkAndResetDailyTasks();
    });
  }

  /* ===================================================================
     Application Initialization
     =================================================================== */

  function init() {
    initTheme();
    loadTasks();
    loadUserProfile();
    checkAndResetDailyTasks(); // Check if today is a new day compared to last reset
    scheduleMidnightTimer();
    updateMidnightCountdown();
    setInterval(updateMidnightCountdown, 1000); // 1-sec countdown interval

    if (currentDateDisplay) {
      currentDateDisplay.textContent = formatFriendlyDate();
    }

    setupEventListeners();
    renderTasks();
    updateStats();
    lucide.createIcons();
  }

  // Start app on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
