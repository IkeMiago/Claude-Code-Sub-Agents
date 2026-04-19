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

  /* deadline は "YYYY-MM-DD" 形式の文字列または "" */
  function addTodo(text, deadline) {
    var trimmed = text.trim();
    if (!trimmed) return null;
    var now = Date.now();
    var todo = {
      id: generateId(),
      text: trimmed,
      completed: false,
      createdAt: now,
      /* 締切日（未設定の場合は空文字） */
      deadline: deadline || "",
    };
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

  /* 締切日を更新する（空文字で解除） */
  function updateTodoDeadline(id, deadline) {
    var todo = todos.find(function (t) { return t.id === id; });
    if (!todo) return;
    todo.deadline = deadline || "";
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
     締切日ユーティリティ
     ========================================================= */

  /* "YYYY-MM-DD" → "YYYY年M月D日" に変換（タイムゾーンずれを防ぐ） */
  function formatDeadline(dateStr) {
    if (!dateStr) return "";
    var parts = dateStr.split("-");
    return parts[0] + "年" + parseInt(parts[1], 10) + "月" + parseInt(parts[2], 10) + "日";
  }

  /* 締切日の状態を返す: "overdue" / "today" / "upcoming" / null */
  function getDeadlineStatus(dateStr) {
    if (!dateStr) return null;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var parts = dateStr.split("-");
    var deadline = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (deadline < today) return "overdue";
    if (deadline.getTime() === today.getTime()) return "today";
    return "upcoming";
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

    /* テキストとメタ情報をまとめるコンテンツエリア */
    var content = document.createElement("div");
    content.className = "todo-content";

    /* テキストラベル（ダブルクリックで編集） */
    var label = document.createElement("label");
    label.textContent = todo.text;
    label.addEventListener("dblclick", function () {
      startTextEdit(li, label, todo);
    });

    /* 締切日表示エリア */
    var deadlineEl = buildDeadlineElement(todo);

    content.append(label, deadlineEl);

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

    li.append(checkbox, content, deleteBtn);
    return li;
  }

  /* 締切日表示要素を生成する */
  function buildDeadlineElement(todo) {
    var deadlineEl = document.createElement("span");
    deadlineEl.className = "todo-deadline";

    if (todo.deadline) {
      var status = getDeadlineStatus(todo.deadline);
      deadlineEl.textContent = "期限: " + formatDeadline(todo.deadline);
      if (status) deadlineEl.classList.add(status);
    } else {
      deadlineEl.textContent = "期限を設定";
      deadlineEl.classList.add("no-deadline");
    }

    /* クリックで締切日のインライン編集モードに入る */
    deadlineEl.addEventListener("click", function () {
      startDeadlineEdit(deadlineEl, todo);
    });

    return deadlineEl;
  }

  /* テキストのインライン編集 */
  function startTextEdit(li, label, todo) {
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

    /* contentDiv 内の label を input に差し替える */
    var contentDiv = li.querySelector(".todo-content");
    contentDiv.replaceChild(input, label);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  /* 締切日のインライン編集 */
  function startDeadlineEdit(deadlineEl, todo) {
    var dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.className = "deadline-edit-input";
    dateInput.value = todo.deadline || "";

    var done = false;

    function commit() {
      if (done) return;
      done = true;
      updateTodoDeadline(todo.id, dateInput.value);
      render();
    }

    function cancel() {
      if (done) return;
      done = true;
      render();
    }

    dateInput.addEventListener("blur", commit);
    dateInput.addEventListener("change", function () {
      /* 日付選択後すぐに確定する */
      dateInput.blur();
    });
    dateInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); dateInput.blur(); }
      if (e.key === "Escape") {
        e.preventDefault();
        dateInput.removeEventListener("blur", commit);
        cancel();
      }
    });

    deadlineEl.parentNode.replaceChild(dateInput, deadlineEl);
    dateInput.focus();
  }

  /* =========================================================
     イベント配線
     ========================================================= */
  var form = document.getElementById("todo-form");
  var newTodoInput = document.getElementById("new-todo");
  var newDeadlineInput = document.getElementById("new-deadline");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (addTodo(newTodoInput.value, newDeadlineInput.value)) {
      newTodoInput.value = "";
      newDeadlineInput.value = "";
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
