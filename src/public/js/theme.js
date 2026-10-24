/**
 * Theme Switch Module
 * Handles dark/light mode toggle with localStorage persistence
 */

const STORAGE_KEY = 'theme';
const DARK = 'dark';
const LIGHT = 'light';

/**
 * Get stored theme or system preference
 * @returns {string} 'dark' or 'light'
 */
function getInitialTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === DARK || stored === LIGHT) {
    return stored;
  }

  // Respect system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return DARK;
  }

  return LIGHT;
}

/**
 * Apply theme to document and update icons
 * @param {string} theme - 'dark' or 'light'
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  const iconLight = document.getElementById('themeIconLight');
  const iconDark = document.getElementById('themeIconDark');

  if (iconLight && iconDark) {
    if (theme === DARK) {
      iconLight.classList.remove('active');
      iconDark.classList.add('active');
    } else {
      iconLight.classList.add('active');
      iconDark.classList.remove('active');
    }
  }

  // Store preference
  localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * Toggle between dark and light themes
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || LIGHT;
  const next = current === DARK ? LIGHT : DARK;
  applyTheme(next);
}

/**
 * Initialize theme switch
 */
export function initTheme() {
  // Apply initial theme immediately (before paint)
  const initialTheme = getInitialTheme();
  applyTheme(initialTheme);

  // Bind toggle button
  const switchBtn = document.getElementById('themeSwitch');
  if (switchBtn) {
    switchBtn.addEventListener('click', toggleTheme);
  }

  // Listen for system preference changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(e.matches ? DARK : LIGHT);
      }
    });
  }
}

// Auto-init when module loads
initTheme();
