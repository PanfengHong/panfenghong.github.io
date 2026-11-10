/** @type {import('tailwindcss').Config} */
module.exports = {
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
          bg: 'rgb(13 17 23)',
          border: 'rgb(48 54 61)',
          surface: 'rgb(22 27 34)',
          muted: 'rgb(139 148 158)',
          text: 'rgb(201 209 217)'
        }
      },
    },
  },
  plugins: [],
}
