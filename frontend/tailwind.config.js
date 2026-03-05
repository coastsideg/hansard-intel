/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'intel-black': '#0a0a0f',
        'intel-dark': '#111118',
        'intel-card': '#16161e',
        'intel-border': '#1e1e2e',
        'intel-gold': '#c9a84c',
        'intel-gold-dim': 'rgba(201,168,76,0.12)',
        'intel-red': '#e63946',
        'intel-blue': '#4a90d9',
        'intel-green': '#2a9d5c',
        'intel-muted': '#6b7280',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    }
  },
  plugins: []
}
