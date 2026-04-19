/**
 * storage.js
 * ------------------------------------------------------------
 * Thin wrapper around `localStorage` that isolates persistence
 * concerns from the rest of the application.
 *
 * Layer: Infrastructure
 * Depends on: Web Storage API (browser)
 *
 * Exposes load/save operations for the todo collection. All I/O
 * errors are caught and logged so that domain logic can treat
 * storage as best-effort without needing to know about quota
 * errors, disabled storage, or malformed JSON.
 */

const STORAGE_KEY = "todo-app:todos";

/**
 * Load the persisted todo list.
 * Returns an empty array if nothing is stored, if storage is
 * unavailable, or if the stored payload is corrupted.
 *
 * @returns {Array<object>}
 */
export function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("[storage] Failed to load todos:", err);
    return [];
  }
}

/**
 * Persist the todo list.
 *
 * @param {Array<object>} todos
 */
export function saveTodos(todos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (err) {
    console.error("[storage] Failed to save todos:", err);
  }
}

/**
 * Clear all persisted data. Primarily useful for tests or a
 * future "reset" feature.
 */
export function clearTodos() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("[storage] Failed to clear todos:", err);
  }
}
