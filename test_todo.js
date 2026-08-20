// Automated Verification Test for TaskFlow logic

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

// Helper
function getLocalDateString(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

console.log('--- Starting Neumorphic To-Do Core Logic Tests ---');

// Test 1: Task structure and initial state
let tasks = [
  {
    id: '1',
    title: 'Daily Yoga Routine',
    type: 'daily',
    completed: true,
    completedDate: '2026-08-19' // completed yesterday
  },
  {
    id: '2',
    title: 'Pay electric bill',
    type: 'one-time',
    completed: true,
    completedDate: '2026-08-19' // completed yesterday
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
function checkAndResetDailyTasks(tasksList, todayStr, lastResetDate, isSimulated = false) {
  let resetCount = 0;
  tasksList.forEach(task => {
    // Only daily tasks can reset
    if (task.type === 'daily') {
      if (task.completed) {
        if (isSimulated || task.completedDate !== todayStr || lastResetDate !== todayStr) {
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

const today = getLocalDateString(new Date()); // '2026-08-20'
const resetCount = checkAndResetDailyTasks(tasks, today, '2026-08-19');

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

// Test 3: Complete Daily Task today, simulate another midnight
dailyTask.completed = true;
dailyTask.completedDate = today;

const simulatedResetCount = checkAndResetDailyTasks(tasks, '2026-08-21', today);
assert.strictEqual(simulatedResetCount, 1, 'Simulated rollover to next day resets the daily task again');
assert.strictEqual(dailyTask.completed, false, 'Daily task resets again on new date');
assert.strictEqual(oneTimeTask.completed, true, 'One-time task still remains completed');

console.log('✓ Simulated date rollover confirmed daily reset while preserving one-time tasks!');
console.log('--- ALL TESTS PASSED SUCCESSFULLY! ---');
