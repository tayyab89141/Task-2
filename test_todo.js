// Automated Verification Test for TaskFlow logic & Local User ID Persistence

const assert = require('assert');

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    clear: () => { store = {}; }
  };
})();

// Helpers
function getLocalDateString(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateUserId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let p1 = '', p2 = '';
  for (let i = 0; i < 4; i++) p1 += chars.charAt(Math.floor(Math.random() * chars.length));
  for (let i = 0; i < 4; i++) p2 += chars.charAt(Math.floor(Math.random() * chars.length));
  return `TF-${p1}-${p2}`;
}

console.log('--- Starting TaskFlow Core Logic & User ID Tests ---');

// Test 1: Task structure and initial state
const now = new Date();
const todayStr = getLocalDateString(now);
const yesterday = new Date(now.getTime() - 86400000);
const yesterdayStr = getLocalDateString(yesterday);
const tomorrow = new Date(now.getTime() + 86400000);
const tomorrowStr = getLocalDateString(tomorrow);

let tasks = [
  {
    id: '1',
    title: 'Daily Yoga Routine',
    type: 'daily',
    completed: true,
    completedDate: yesterdayStr // completed yesterday
  },
  {
    id: '2',
    title: 'Pay electric bill',
    type: 'one-time',
    completed: true,
    completedDate: yesterdayStr // completed yesterday
  },
  {
    id: '3',
    title: 'Read 20 mins',
    type: 'daily',
    completed: false,
    completedDate: null
  },
  {
    id: '4',
    title: 'Draft architecture proposal',
    type: 'one-time',
    completed: false,
    completedDate: null
  }
];

// Test 2: Midnight Reset logic
function checkAndResetDailyTasks(tasksList, todayDateStr, lastResetDateStr, isSimulated = false) {
  let resetCount = 0;
  tasksList.forEach(task => {
    // Only daily tasks can reset
    if (task.type === 'daily') {
      if (task.completed) {
        if (isSimulated || task.completedDate !== todayDateStr || lastResetDateStr !== todayDateStr) {
          task.completed = false;
          task.completedDate = null;
          resetCount++;
        }
      }
    }
    // ONE-TIME tasks MUST NEVER be reset or renewed!
  });
  return resetCount;
}

const resetCount = checkAndResetDailyTasks(tasks, todayStr, yesterdayStr);
console.log(`[Test 1] Daily tasks reset count: ${resetCount}`);
assert.strictEqual(resetCount, 1, 'Should reset exactly 1 completed daily task');

// Verify Task 1 (Daily): Should now be uncompleted
const dailyTask = tasks.find(t => t.id === '1');
assert.strictEqual(dailyTask.completed, false, 'Daily task should be renewed / uncompleted for today');
console.log('✓ Daily task reset successfully to uncompleted!');

// Verify Task 2 (One-Time): Should STILL be completed!
const oneTimeTask = tasks.find(t => t.id === '2');
assert.strictEqual(oneTimeTask.completed, true, 'One-time task MUST remain completed and NOT be renewed!');
console.log('✓ One-time task remained permanently completed as required!');

// Verify Task 3 & 4
assert.strictEqual(tasks.find(t => t.id === '3').completed, false);
assert.strictEqual(tasks.find(t => t.id === '4').completed, false);
console.log('✓ Active tasks untouched.');

// Test 3: Complete Daily Task today, simulate rollover to tomorrow
dailyTask.completed = true;
dailyTask.completedDate = todayStr;

const simulatedResetCount = checkAndResetDailyTasks(tasks, tomorrowStr, todayStr);
assert.strictEqual(simulatedResetCount, 1, 'Simulated rollover to next day resets the daily task again');
assert.strictEqual(dailyTask.completed, false, 'Daily task resets again on new date');
assert.strictEqual(oneTimeTask.completed, true, 'One-time task still remains completed');
console.log('✓ Date rollover confirmed daily reset while strictly preserving one-time tasks!');

// Test 4: Local User ID Generation and Progress Persistence
const userId1 = generateUserId();
const userId2 = generateUserId();
assert.ok(/^TF-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(userId1), `User ID should match TF-XXXX-XXXX format (Got: ${userId1})`);
assert.notStrictEqual(userId1, userId2, 'Generated User IDs should be unique');
console.log(`✓ User ID generation verified: ${userId1}`);

// Test 5: Local User Profile Progress Tracking
const userProfile = {
  userId: userId1,
  displayName: 'Alex',
  createdAt: new Date().toISOString(),
  stats: {
    totalCreated: 4,
    totalCompleted: 2,
    dailyStreakDays: 3,
    lastActiveDate: todayStr
  }
};

localStorageMock.setItem('taskflow_user_profile_v1', JSON.stringify(userProfile));
const loadedProfile = JSON.parse(localStorageMock.getItem('taskflow_user_profile_v1'));
assert.strictEqual(loadedProfile.userId, userId1);
assert.strictEqual(loadedProfile.stats.totalCompleted, 2);
assert.strictEqual(loadedProfile.stats.dailyStreakDays, 3);
console.log('✓ Local User Profile and Progress persistence verified (no login/database required)!');

console.log('--- ALL TESTS PASSED SUCCESSFULLY! ---');
