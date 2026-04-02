/* ==============================================
   Theme Toggle — Dark / Light Mode
   Shared across all pages
   ============================================== */

(function () {
    'use strict';

    const STORAGE_KEY = 'bb-theme';
    const DARK = 'dark';
    const LIGHT = 'light';

    // ── Determine initial theme ─────────────────
    function getPreferredTheme() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return stored;
        // Respect OS-level preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return DARK;
        }
        return LIGHT;
    }

    // ── Apply theme to document ─────────────────
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        updateToggleIcons(theme);
    }

    // ── Update all toggle button icons ──────────
    function updateToggleIcons(theme) {
        document.querySelectorAll('.theme-toggle .theme-icon').forEach(icon => {
            icon.textContent = theme === DARK ? '☀️' : '🌙';
            // Quick rotate animation
            icon.style.transform = 'rotate(360deg)';
            setTimeout(() => { icon.style.transform = 'rotate(0deg)'; }, 400);
        });
    }

    // ── Toggle between dark and light ───────────
    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || LIGHT;
        const next = current === DARK ? LIGHT : DARK;
        localStorage.setItem(STORAGE_KEY, next);
        applyTheme(next);
    }

    // ── Initialize on DOM ready ─────────────────
    // Apply immediately to prevent flash of wrong theme
    applyTheme(getPreferredTheme());

    document.addEventListener('DOMContentLoaded', function () {
        // Bind all toggle buttons
        document.querySelectorAll('.theme-toggle').forEach(btn => {
            btn.addEventListener('click', toggleTheme);
        });
        // Ensure icons are correct after DOM loads
        updateToggleIcons(getPreferredTheme());
    });

    // Listen for system theme changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually set a preference
            if (!localStorage.getItem(STORAGE_KEY)) {
                applyTheme(e.matches ? DARK : LIGHT);
            }
        });
    }

    // Expose globally for external use if needed
    window.toggleTheme = toggleTheme;
})();
