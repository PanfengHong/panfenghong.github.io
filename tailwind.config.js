/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html"
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
        }
      },
    },
  },
  plugins: [],
}
