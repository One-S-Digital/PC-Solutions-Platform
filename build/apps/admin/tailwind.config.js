/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Swiss Modern Color Palette - Admin (Dark Theme)
        'admin-mint': '#059669',      // Darker mint
        'admin-teal': '#0D9488',      // Darker teal
        'admin-coral': '#EA580C',     // Darker coral
        'admin-sand': '#D97706',      // Darker sand
        'admin-charcoal': '#1F2937',  // Darker charcoal
        'admin-gray': '#4B5563',      // Darker gray
        'admin-dark': '#111827',      // Very dark background
        'admin-light': '#F3F4F6',     // Light text on dark
        
        // Admin Color Variations
        'admin-mint-light': '#A7F3D0',
        'admin-mint-dark': '#047857',
        'admin-teal-light': '#99F6E4',
        'admin-teal-dark': '#0F766E',
        'admin-coral-light': '#FDBA74',
        'admin-coral-dark': '#C2410C',
        'admin-sand-light': '#FCD34D',
        'admin-sand-dark': '#B45309',
        
        // Legacy primary colors (keeping for compatibility)
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        'swiss': ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'button': '0.5rem',
        'card': '0.75rem',
        'input': '0.5rem',
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.2), 0 1px 2px 0 rgba(0, 0, 0, 0.1)',
        'interactive': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'minimal': '0 1px 2px 0 rgba(0, 0, 0, 0.1)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
}