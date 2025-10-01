/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Swiss Modern Color Palette - Frontend (Light Theme)
        'swiss-mint': '#10B981',
        'swiss-teal': '#14B8A6', 
        'swiss-coral': '#F97316',
        'swiss-sand': '#F59E0B',
        'swiss-charcoal': '#374151',
        'swiss-gray': '#6B7280',
        'swiss-light': '#F9FAFB',
        'swiss-white': '#FFFFFF',
        
        // Swiss Color Variations
        'swiss-mint-light': '#D1FAE5',
        'swiss-mint-dark': '#059669',
        'swiss-teal-light': '#CCFBF1',
        'swiss-teal-dark': '#0D9488',
        'swiss-coral-light': '#FED7AA',
        'swiss-coral-dark': '#EA580C',
        'swiss-sand-light': '#FEF3C7',
        'swiss-sand-dark': '#D97706',
        
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
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'interactive': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'minimal': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
}