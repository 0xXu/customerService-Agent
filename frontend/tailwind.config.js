/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
      colors: {
        lumina: {
          background: '#f7f9fb',
          primary: '#4648d4',
          primaryFixed: '#e1e0ff',
          secondaryContainer: '#a6b5fd',
          outline: '#767586',
          outlineVariant: '#c7c4d7',
          surfaceVariant: '#e0e3e5',
          text: '#191c1e',
          textMuted: '#464554',
        },
      },
    },
  },
  plugins: [],
}
