/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./projects/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#475569',
        danger: '#ef4444',
        success: '#10b981',
        meeting: {
          dark: '#1e293b',
          light: '#f8fafc'
        },
        gh: {
          bg: 'rgb(var(--gh-bg) / <alpha-value>)',
          border: 'rgb(var(--gh-border) / <alpha-value>)',
          divider: 'rgb(var(--gh-divider) / <alpha-value>)',
          surface: 'rgb(var(--gh-surface) / <alpha-value>)',
          muted: 'rgb(var(--gh-muted) / <alpha-value>)',
          text: 'rgb(var(--gh-text) / <alpha-value>)'
        }
      },
    },
  },
  plugins: [],
}
