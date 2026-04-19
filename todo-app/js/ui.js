/**
 * ui.js
 * ------------------------------------------------------------
 * Presentation layer: DOM rendering and event wiring.
 *
 * This module is intentionally ignorant of domain state — it
 * receives data to render and emits user intents via callbacks
 * supplied from `app.js`. Keeping UI free of data mutation
 * makes rendering easy to reason about and the app trivially
 * testable at the boundary.
 *
 * Security: all user-provided text is rendered via `textContent`
 * (never `innerHTML`) to eliminate XSS vectors.
 */

/* ----------------------------------------------------------
   DOM references (captured once — the DOM is static)
   ---------------------------------------------------------- */
const form = document.getElementById("todo-form");
const newTodoInput = document.getElementById("new-todo");
const listSection = document.getElementById("todo-list-section");
const listEl = document.getElementById("todo-list");
const footerEl = document.getElementById("todo-footer");
const itemCountEl = document.getElementById("item-count");
const filterButtonsEl = document.getElementById("filter-buttons");
const clearCompletedBtn = document.getElementById("clear-completed");

/* ----------------------------------------------------------
   Callback handlers — wired by app.js via `bindHandlers`
   ---------------------------------------------------------- */

/**
 * @typedef {Object} UIHandlers
 * @property {(text: string) => void}   onAdd
 * @property {(id: string) => void}     onToggle
 * @property {(id: string) => void}     onDelete
 * @property {(id: string, text: string) => void} onEdit
 * @property {(filter: string) => void} onFilterChange
 * @property {() => void}               onClearCompleted
 */

/** @type {UIHandlers|null} */
let handlers = null;

/**
 * @param {UIHandlers} h
 */
export function bindHandlers(h) {
  handlers = h;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = newTodoInput.value;
    // Empty-input guard lives in the domain layer too; we guard
    // here as well to avoid a pointless callback round-trip.
    if (value.trim() === "") return;
    handlers.onAdd(value);
    newTodoInput.value = "";
    newTodoInput.focus();
  });

  filterButtonsEl.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const filter = target.dataset.filter;
    if (!filter) return;
    handlers.onFilterChange(filter);
  });

  clearCompletedBtn.addEventListener("click", () => {
    handlers.onClearCompleted();
  });
}

/* ----------------------------------------------------------
   Rendering
   ---------------------------------------------------------- */

/**
 * @typedef {Object} RenderState
 * @property {Array<object>} todos          todos to display (already filtered)
 * @property {number}        activeCount
 * @property {boolean}       hasCompleted
 * @property {string}        filter
 * @property {number}        totalCount     total todos (pre-filter)
 */

/**
 * Full re-render. Simpler and fast enough for a todo app; no
 * virtual-DOM diffing needed.
 *
 * @param {RenderState} state
 */
export function render(state) {
  renderVisibility(state.totalCount);
  renderList(state.todos);
  renderCount(state.activeCount);
  renderFilter(state.filter);
  renderClearCompleted(state.hasCompleted);
}

function renderList(todos) {
  while (listEl.firstChild) {
    listEl.removeChild(listEl.firstChild);
  }
  const fragment = document.createDocumentFragment();
  for (const todo of todos) {
    fragment.appendChild(createTodoItem(todo));
  }
  listEl.appendChild(fragment);
}

function renderVisibility(totalCount) {
  const hidden = totalCount === 0;
  listSection.hidden = hidden;
  footerEl.hidden = hidden;
}

function renderCount(activeCount) {
  const suffix = activeCount === 1 ? "item" : "items";
  itemCountEl.textContent = `${activeCount} ${suffix} left`;
}

function renderFilter(filter) {
  const buttons = filterButtonsEl.querySelectorAll("button[data-filter]");
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
}

function renderClearCompleted(hasCompleted) {
  clearCompletedBtn.hidden = !hasCompleted;
}

/* ----------------------------------------------------------
   Todo item construction
   ---------------------------------------------------------- */

function createTodoItem(todo) {
  const li = document.createElement("li");
  li.className = "todo-item" + (todo.completed ? " completed" : "");
  li.dataset.id = todo.id;

  // Checkbox
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = todo.completed;
  checkbox.addEventListener("change", () => {
    handlers?.onToggle(todo.id);
  });

  // Label — double-click enters edit mode
  const label = document.createElement("label");
  label.textContent = todo.text; // XSS-safe
  label.addEventListener("dblclick", () => {
    enterEditMode(li, label, todo);
  });

  // Delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-btn";
  deleteBtn.setAttribute("aria-label", "Delete todo");
  deleteBtn.textContent = "\u2715"; // ✕
  deleteBtn.addEventListener("click", () => {
    handlers?.onDelete(todo.id);
  });

  li.append(checkbox, label, deleteBtn);
  return li;
}

/* ----------------------------------------------------------
   Inline edit mode
   ---------------------------------------------------------- */

function enterEditMode(li, label, todo) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "edit-input";
  input.value = todo.text;

  let committed = false;

  const commit = () => {
    if (committed) return;
    committed = true;
    handlers?.onEdit(todo.id, input.value);
  };

  const cancel = () => {
    if (committed) return;
    committed = true;
    // Passing the original text round-trips through the domain
    // layer as a no-op update, which also triggers a re-render
    // that restores the original label. This keeps UI free of
    // any direct DOM rollback logic.
    handlers?.onEdit(todo.id, todo.text);
  };

  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      input.blur(); // triggers commit
    } else if (e.key === "Escape") {
      e.preventDefault();
      // Detach the blur listener first so `cancel` is the sole
      // exit path and `commit` doesn't fire with the unchanged
      // value afterwards.
      input.removeEventListener("blur", commit);
      cancel();
    }
  });

  li.replaceChild(input, label);
  input.focus();
  // Place caret at end.
  input.setSelectionRange(input.value.length, input.value.length);
}

/* ----------------------------------------------------------
   Initial focus helper
   ---------------------------------------------------------- */

export function focusInput() {
  newTodoInput.focus();
}
