(function () {
  "use strict";

  /* =========================================================
     ストレージ層
     ========================================================= */
  var STORAGE_KEY = "todo-app:todos";

  function loadTodos() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveTodos(todos) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (e) {}
  }

  /* =========================================================
     ドメイン層
     ========================================================= */
  var todos = loadTodos();
  var currentFilter = "all";

  function generateId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "todo-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
  }

  function addTodo(text) {
    var trimmed = text.trim();
    if (!trimmed) return null;
    var now = Date.now();
    var todo = { id: generateId(), text: trimmed, completed: false, createdAt: now };
    todos.push(todo);
    saveTodos(todos);
    return todo;
  }

  function toggleTodo(id) {
    var todo = todos.find(function (t) { return t.id === id; });
    if (!todo) return;
    todo.completed = !todo.completed;
    saveTodos(todos);
  }

  function updateTodoText(id, text) {
    var trimmed = text.trim();
    if (!trimmed) {
      deleteTodo(id);
      return;
    }
    var todo = todos.find(function (t) { return t.id === id; });
    if (!todo) return;
    todo.text = trimmed;
    saveTodos(todos);
  }

  function deleteTodo(id) {
    todos = todos.filter(function (t) { return t.id !== id; });
    saveTodos(todos);
  }

  function clearCompleted() {
    todos = todos.filter(function (t) { return !t.completed; });
    saveTodos(todos);
  }

  function getFiltered() {
    if (currentFilter === "active") return todos.filter(function (t) { return !t.completed; });
    if (currentFilter === "completed") return todos.filter(function (t) { return t.completed; });
    return todos.slice();
  }

  /* =========================================================
     プレゼンテーション層
     ========================================================= */
  var listSection = document.getElementById("todo-list-section");
  var listEl = document.getElementById("todo-list");
  var footerEl = document.getElementById("todo-footer");
  var itemCountEl = document.getElementById("item-count");
  var filterButtonsEl = document.getElementById("filter-buttons");
  var clearCompletedBtn = document.getElementById("clear-completed");

  function render() {
    var filtered = getFiltered();
    var activeCount = todos.filter(function (t) { return !t.completed; }).length;
    var hasCompleted = todos.some(function (t) { return t.completed; });

    /* セクション表示 */
    listSection.hidden = todos.length === 0;
    footerEl.hidden = todos.length === 0;

    /* 件数 */
    itemCountEl.textContent = activeCount + " item" + (activeCount !== 1 ? "s" : "") + " left";

    /* フィルタボタン */
    filterButtonsEl.querySelectorAll("button[data-filter]").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.filter === currentFilter);
    });

    /* Clear completed */
    clearCompletedBtn.hidden = !hasCompleted;

    /* リスト */
    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
    var fragment = document.createDocumentFragment();
    filtered.forEach(function (todo) {
      fragment.appendChild(createItem(todo));
    });
    listEl.appendChild(fragment);
  }

  function createItem(todo) {
    var li = document.createElement("li");
    li.className = "todo-item" + (todo.completed ? " completed" : "");
    li.dataset.id = todo.id;

    /* チェックボックス */
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.addEventListener("change", function () {
      toggleTodo(todo.id);
      render();
    });

    /* テキストラベル（ダブルクリックで編集） */
    var label = document.createElement("label");
    label.textContent = todo.text;
    label.addEventListener("dblclick", function () {
      startEdit(li, label, todo);
    });

    /* 削除ボタン */
    var deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.setAttribute("aria-label", "Delete");
    deleteBtn.textContent = "\u2715";
    deleteBtn.addEventListener("click", function () {
      deleteTodo(todo.id);
      render();
    });

    li.append(checkbox, label, deleteBtn);
    return li;
  }

  function startEdit(li, label, todo) {
    var input = document.createElement("input");
    input.type = "text";
    input.className = "edit-input";
    input.value = todo.text;

    var done = false;

    function commit() {
      if (done) return;
      done = true;
      updateTodoText(todo.id, input.value);
      render();
    }

    function cancel() {
      if (done) return;
      done = true;
      render();
    }

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); input.blur(); }
      if (e.key === "Escape") {
        e.preventDefault();
        input.removeEventListener("blur", commit);
        cancel();
      }
    });

    li.replaceChild(input, label);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  /* =========================================================
     イベント配線
     ========================================================= */
  var form = document.getElementById("todo-form");
  var newTodoInput = document.getElementById("new-todo");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (addTodo(newTodoInput.value)) {
      newTodoInput.value = "";
      render();
    }
    newTodoInput.focus();
  });

  filterButtonsEl.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-filter]");
    if (!btn) return;
    currentFilter = btn.dataset.filter;
    render();
  });

  clearCompletedBtn.addEventListener("click", function () {
    clearCompleted();
    render();
  });

  /* 初期描画 */
  render();
  newTodoInput.focus();
})();
