const input = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const filterBar = document.getElementById('filter-bar');
const filterBtns = document.querySelectorAll('.filter-btn');
const footer = document.getElementById('footer');
const itemsLeft = document.getElementById('items-left');
const clearBtn = document.getElementById('clear-btn');
const emptyMsg = document.getElementById('empty-msg');

let todos = JSON.parse(localStorage.getItem('todos') || '[]');
let filter = 'all';
let editingId = null;

function save() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

function addTodo() {
  const text = input.value.trim();
  if (!text) return;
  todos.push({ id: Date.now(), text, completed: false });
  input.value = '';
  save();
  render();
}

function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) todo.completed = !todo.completed;
  save();
  render();
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  save();
  render();
}

function startEdit(id, spanEl) {
  if (editingId === id) return;
  editingId = id;
  const todo = todos.find(t => t.id === id);
  const editInput = document.createElement('input');
  editInput.className = 'edit-input';
  editInput.value = todo.text;
  spanEl.replaceWith(editInput);
  editInput.focus();

  const commit = () => {
    const trimmed = editInput.value.trim();
    if (trimmed) todo.text = trimmed;
    editingId = null;
    save();
    render();
  };

  editInput.addEventListener('blur', commit);
  editInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') { editingId = null; render(); }
  });
}

function render() {
  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  todoList.innerHTML = '';
  filtered.forEach(todo => {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' completed' : '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = todo.text;
    span.addEventListener('dblclick', () => startEdit(todo.id, span));

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => deleteTodo(todo.id));

    li.append(checkbox, span, delBtn);
    todoList.appendChild(li);
  });

  const activeCount = todos.filter(t => !t.completed).length;
  const hasCompleted = todos.some(t => t.completed);

  filterBar.hidden = todos.length === 0;
  footer.hidden = todos.length === 0;
  itemsLeft.textContent = `${activeCount} item${activeCount !== 1 ? 's' : ''} left`;
  clearBtn.hidden = !hasCompleted;

  if (filtered.length === 0 && todos.length > 0) {
    emptyMsg.textContent = `No ${filter} todos.`;
  } else if (todos.length === 0) {
    emptyMsg.textContent = 'Add your first todo above!';
  } else {
    emptyMsg.textContent = '';
  }
}

addBtn.addEventListener('click', addTodo);
input.addEventListener('keydown', e => e.key === 'Enter' && addTodo());

clearBtn.addEventListener('click', () => {
  todos = todos.filter(t => !t.completed);
  save();
  render();
});

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    filterBtns.forEach(b => b.classList.toggle('active', b === btn));
    render();
  });
});

render();
