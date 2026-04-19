/**
 * todo.js
 * ------------------------------------------------------------
 * Domain & Application layer for the todo feature.
 *
 * Owns the in-memory list of todos and the business rules that
 * govern them (creation, update, deletion, filtering, counting).
 * Persistence is delegated to `storage.js` — this module never
 * touches `localStorage` directly.
 *
 * The UI layer never mutates todo state; it calls these
 * functions and re-renders from the returned snapshot.
 */

import { loadTodos, saveTodos } from "./storage.js";

/**
 * @typedef {Object} Todo
 * @property {string} id
 * @property {string} text
 * @property {boolean} completed
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/** @type {Todo[]} */
let todos = loadTodos();

/** Valid filter values. */
export const FILTERS = Object.freeze({
  ALL: "all",
  ACTIVE: "active",
  COMPLETED: "completed",
});

/* ----------------------------------------------------------
   Internal helpers
   ---------------------------------------------------------- */

function persist() {
  saveTodos(todos);
}

function generateId() {
  // `crypto.randomUUID` is available in all modern browsers.
  // Fallback kept for extremely old environments / file:// in
  // some browsers where `crypto` may be undefined.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `todo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ----------------------------------------------------------
   Queries
   ---------------------------------------------------------- */

/**
 * Return an immutable snapshot of all todos.
 * @returns {Todo[]}
 */
export function getAllTodos() {
  return todos.slice();
}

/**
 * Return todos filtered by completion status.
 * @param {"all"|"active"|"completed"} filter
 * @returns {Todo[]}
 */
export function getFilteredTodos(filter) {
  switch (filter) {
    case FILTERS.ACTIVE:
      return todos.filter((t) => !t.completed);
    case FILTERS.COMPLETED:
      return todos.filter((t) => t.completed);
    case FILTERS.ALL:
    default:
      return todos.slice();
  }
}

/**
 * Count of active (non-completed) todos.
 * @returns {number}
 */
export function getActiveCount() {
  return todos.reduce((acc, t) => (t.completed ? acc : acc + 1), 0);
}

/**
 * Whether at least one todo is currently completed.
 * @returns {boolean}
 */
export function hasCompleted() {
  return todos.some((t) => t.completed);
}

/* ----------------------------------------------------------
   Commands
   ---------------------------------------------------------- */

/**
 * Create and store a new todo. Empty / whitespace-only text is
 * rejected and returns `null` so the caller can short-circuit
 * UI updates.
 *
 * @param {string} text
 * @returns {Todo|null}
 */
export function addTodo(text) {
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) return null;

  const now = Date.now();
  /** @type {Todo} */
  const todo = {
    id: generateId(),
    text: trimmed,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };

  todos.push(todo);
  persist();
  return todo;
}

/**
 * Toggle the `completed` flag of a todo.
 * @param {string} id
 * @returns {Todo|null}
 */
export function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return null;

  todo.completed = !todo.completed;
  todo.updatedAt = Date.now();
  persist();
  return todo;
}

/**
 * Update the text of an existing todo. Empty text triggers
 * deletion — the common UX convention for the TodoMVC pattern.
 *
 * @param {string} id
 * @param {string} text
 * @returns {Todo|null} the updated todo, or `null` if the todo
 *                     was deleted or not found.
 */
export function updateTodoText(id, text) {
  const trimmed = typeof text === "string" ? text.trim() : "";

  if (!trimmed) {
    deleteTodo(id);
    return null;
  }

  const todo = todos.find((t) => t.id === id);
  if (!todo) return null;

  todo.text = trimmed;
  todo.updatedAt = Date.now();
  persist();
  return todo;
}

/**
 * Remove a todo by id.
 * @param {string} id
 * @returns {boolean} whether a todo was actually removed.
 */
export function deleteTodo(id) {
  const before = todos.length;
  todos = todos.filter((t) => t.id !== id);
  const removed = todos.length !== before;
  if (removed) persist();
  return removed;
}

/**
 * Remove all completed todos.
 * @returns {number} number of todos removed.
 */
export function clearCompleted() {
  const before = todos.length;
  todos = todos.filter((t) => !t.completed);
  const removed = before - todos.length;
  if (removed > 0) persist();
  return removed;
}
