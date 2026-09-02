/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        yt: {
          bg: '#0f0f0f',
          card: '#181818',
          hover: '#272727',
          sidebar: '#0f0f0f',
          red: '#ff0000',
          text: '#f1f1f1',
          muted: '#aaaaaa',
          border: '#272727'
        }
      }
    },
  },
  plugins: [],
}
