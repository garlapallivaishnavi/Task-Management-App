const STORAGE_KEY = 'taskwave_tasks';
const THEME_KEY = 'taskwave_theme';
const priorityScore = { High: 3, Medium: 2, Low: 1 };

let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let currentView = 'all';
let draggedTaskId = null;

const elements = {
  themeToggle: document.querySelector('#themeToggle'),
  openFormBtn: document.querySelector('#openFormBtn'),
  closeFormBtn: document.querySelector('#closeFormBtn'),
  taskFormPanel: document.querySelector('#taskFormPanel'),
  taskForm: document.querySelector('#taskForm'),
  formTitle: document.querySelector('#formTitle'),
  taskId: document.querySelector('#taskId'),
  titleInput: document.querySelector('#titleInput'),
  descriptionInput: document.querySelector('#descriptionInput'),
  dueDateInput: document.querySelector('#dueDateInput'),
  priorityInput: document.querySelector('#priorityInput'),
  completedInput: document.querySelector('#completedInput'),
  searchInput: document.querySelector('#searchInput'),
  priorityFilter: document.querySelector('#priorityFilter'),
  sortSelect: document.querySelector('#sortSelect'),
  totalCount: document.querySelector('#totalCount'),
  completedCount: document.querySelector('#completedCount'),
  pendingCount: document.querySelector('#pendingCount'),
  pendingBadge: document.querySelector('#pendingBadge'),
  completedBadge: document.querySelector('#completedBadge'),
  pendingList: document.querySelector('#pendingList'),
  completedList: document.querySelector('#completedList'),
  toast: document.querySelector('#toast'),
};

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.add('hidden'), 2200);
}

function createTaskId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDate(dateValue) {
  if (!dateValue) return 'No due date';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${dateValue}T00:00:00`));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getFilteredTasks() {
  const searchText = elements.searchInput.value.trim().toLowerCase();
  const selectedPriority = elements.priorityFilter.value;

  return tasks.filter((task) => {
    const matchesSearch = `${task.title} ${task.description}`.toLowerCase().includes(searchText);
    const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;
    const matchesView =
      currentView === 'all' ||
      (currentView === 'pending' && !task.completed) ||
      (currentView === 'completed' && task.completed);

    return matchesSearch && matchesPriority && matchesView;
  });
}

function sortTasks(taskList) {
  return [...taskList].sort((a, b) => {
    if (elements.sortSelect.value === 'oldest') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }

    if (elements.sortSelect.value === 'dueDate') {
      return (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31');
    }

    if (elements.sortSelect.value === 'priority') {
      return priorityScore[b.priority] - priorityScore[a.priority];
    }

    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

function updateCounters() {
  const completed = tasks.filter((task) => task.completed).length;
  const pending = tasks.length - completed;

  elements.totalCount.textContent = tasks.length;
  elements.completedCount.textContent = completed;
  elements.pendingCount.textContent = pending;
  elements.pendingBadge.textContent = pending;
  elements.completedBadge.textContent = completed;
}

function taskCardTemplate(task) {
  const actionText = task.completed ? 'Reopen' : 'Done';

  return `
    <article class="task-card ${task.completed ? 'completed' : ''}" draggable="true" data-id="${task.id}">
      <div class="task-top">
        <h4 class="task-title">${escapeHtml(task.title)}</h4>
        <div class="task-actions">
          <button class="card-btn" type="button" data-action="toggle" data-id="${task.id}">${actionText}</button>
          <button class="card-btn" type="button" data-action="edit" data-id="${task.id}">Edit</button>
          <button class="card-btn delete" type="button" data-action="delete" data-id="${task.id}">Delete</button>
        </div>
      </div>
      ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}
      <div class="task-meta">
        <span class="pill ${task.priority}">${task.priority}</span>
        <span class="pill">${formatDate(task.dueDate)}</span>
      </div>
    </article>
  `;
}

function renderTaskList(container, taskList, emptyText) {
  if (!taskList.length) {
    container.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }

  container.innerHTML = taskList.map(taskCardTemplate).join('');
}

function renderTasks() {
  updateCounters();

  const visibleTasks = sortTasks(getFilteredTasks());
  const pendingTasks = visibleTasks.filter((task) => !task.completed);
  const completedTasks = visibleTasks.filter((task) => task.completed);

  renderTaskList(elements.pendingList, pendingTasks, 'No pending tasks here. Nice and calm.');
  renderTaskList(elements.completedList, completedTasks, 'No completed tasks yet. Your future self is waiting.');
}

function openTaskForm(task = null) {
  elements.taskForm.reset();
  elements.taskId.value = '';
  elements.formTitle.textContent = 'Add Task';

  if (task) {
    elements.formTitle.textContent = 'Edit Task';
    elements.taskId.value = task.id;
    elements.titleInput.value = task.title;
    elements.descriptionInput.value = task.description;
    elements.dueDateInput.value = task.dueDate;
    elements.priorityInput.value = task.priority;
    elements.completedInput.checked = task.completed;
  }

  elements.taskFormPanel.classList.remove('hidden');
  elements.titleInput.focus();
}

function closeTaskForm() {
  elements.taskFormPanel.classList.add('hidden');
}

function handleFormSubmit(event) {
  event.preventDefault();

  const taskData = {
    title: elements.titleInput.value.trim(),
    description: elements.descriptionInput.value.trim(),
    dueDate: elements.dueDateInput.value,
    priority: elements.priorityInput.value,
    completed: elements.completedInput.checked,
  };

  if (!taskData.title) {
    showToast('Please enter a task title.');
    return;
  }

  const editingId = elements.taskId.value;

  if (editingId) {
    tasks = tasks.map((task) =>
      task.id === editingId ? { ...task, ...taskData, updatedAt: new Date().toISOString() } : task
    );
    showToast('Task updated.');
  } else {
    tasks.unshift({
      id: createTaskId(),
      ...taskData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    showToast('Task added.');
  }

  saveTasks();
  closeTaskForm();
  renderTasks();
}

function handleTaskButtonClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const taskId = button.dataset.id;
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;

  if (button.dataset.action === 'edit') {
    openTaskForm(task);
    return;
  }

  if (button.dataset.action === 'delete') {
    tasks = tasks.filter((item) => item.id !== taskId);
    showToast('Task deleted.');
  }

  if (button.dataset.action === 'toggle') {
    tasks = tasks.map((item) =>
      item.id === taskId ? { ...item, completed: !item.completed, updatedAt: new Date().toISOString() } : item
    );
    showToast(task.completed ? 'Task moved to pending.' : 'Task completed.');
  }

  saveTasks();
  renderTasks();
}

function setupDragAndDrop() {
  document.addEventListener('dragstart', (event) => {
    const card = event.target.closest('.task-card');
    if (!card) return;

    draggedTaskId = card.dataset.id;
    card.classList.add('dragging');
  });

  document.addEventListener('dragend', (event) => {
    event.target.closest('.task-card')?.classList.remove('dragging');
    draggedTaskId = null;
  });

  document.querySelectorAll('.task-list').forEach((list) => {
    list.addEventListener('dragover', (event) => event.preventDefault());

    list.addEventListener('drop', () => {
      if (!draggedTaskId) return;

      const shouldComplete = list.dataset.list === 'completed';
      tasks = tasks.map((task) =>
        task.id === draggedTaskId ? { ...task, completed: shouldComplete, updatedAt: new Date().toISOString() } : task
      );

      saveTasks();
      renderTasks();
      showToast(shouldComplete ? 'Task completed.' : 'Task moved to pending.');
    });
  });
}

function bindEvents() {
  elements.openFormBtn.addEventListener('click', () => openTaskForm());
  elements.closeFormBtn.addEventListener('click', closeTaskForm);
  elements.taskFormPanel.addEventListener('click', (event) => {
    if (event.target === elements.taskFormPanel) closeTaskForm();
  });
  elements.taskForm.addEventListener('submit', handleFormSubmit);
  elements.pendingList.addEventListener('click', handleTaskButtonClick);
  elements.completedList.addEventListener('click', handleTaskButtonClick);
  elements.searchInput.addEventListener('input', renderTasks);
  elements.priorityFilter.addEventListener('change', renderTasks);
  elements.sortSelect.addEventListener('change', renderTasks);

  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      currentView = button.dataset.view;
      renderTasks();
    });
  });

  elements.themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const theme = document.body.classList.contains('dark') ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, theme);
  });
}

function loadTheme() {
  if (localStorage.getItem(THEME_KEY) === 'dark') {
    document.body.classList.add('dark');
  }
}

function addStarterTasks() {
  if (tasks.length) return;

  tasks = [
    {
      id: createTaskId(),
      title: 'Design dashboard layout',
      description: 'Create a clean responsive layout with cards and counters.',
      dueDate: '',
      priority: 'High',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: createTaskId(),
      title: 'Test localStorage saving',
      description: 'Refresh the page and make sure tasks stay visible.',
      dueDate: '',
      priority: 'Medium',
      completed: true,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  saveTasks();
}

function init() {
  loadTheme();
  addStarterTasks();
  bindEvents();
  setupDragAndDrop();
  renderTasks();
}

init();
