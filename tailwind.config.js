/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#4A5568', 600: '#3E4A5B', 700: '#333D4D' },
        secondary: '#A0AEC0',
        accent: { DEFAULT: '#38B2AC', 600: '#319795', 700: '#2C7A7B', 100: '#E6FFFA' },
        surface: '#F7FAFC',
        ink: { DEFAULT: '#2D3748', muted: '#718096' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(45, 55, 72, 0.08), 0 1px 2px rgba(45, 55, 72, 0.04)',
      },
    },
  },
  plugins: [],
};
