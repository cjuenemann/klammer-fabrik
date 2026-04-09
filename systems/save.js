// ============================================================
// SAVE SYSTEM
// ============================================================
const Save = (() => {
  const KEY = 'klammerFabrik_v1';

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Save failed:', e);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clear() {
    localStorage.removeItem(KEY);
  }

  return { save, load, clear };
})();
