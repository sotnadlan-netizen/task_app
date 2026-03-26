/**
 * Remove duplicate tasks that share the same title (case-insensitive, trimmed).
 * The first occurrence wins; subsequent duplicates are dropped.
 *
 * @param {Array<{ title?: string }>} tasks
 * @returns {Array}
 */
export function deduplicateTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  const seen = new Set();
  return tasks.filter((task) => {
    const key = (task.title || "").trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
