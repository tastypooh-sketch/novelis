/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'app-bg': 'var(--app-bg)',
        'app-text': 'var(--app-text)',
        'app-accent': 'var(--app-accent)',
        'app-accent-hover': 'var(--app-accent-hover)',
        'app-success': 'var(--app-success)',
        'app-success-hover': 'var(--app-success-hover)',
        'app-danger': 'var(--app-danger)',
        'app-danger-hover': 'var(--app-danger-hover)',
        'toolbar-bg': 'var(--toolbar-bg)',
        'toolbar-text': 'var(--toolbar-text)',
        'toolbar-button-bg': 'var(--toolbar-button-bg)',
        'toolbar-button-hover': 'var(--toolbar-button-hover)',
        'toolbar-border': 'var(--toolbar-border)',
        'dropdown-bg': 'var(--dropdown-bg)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}