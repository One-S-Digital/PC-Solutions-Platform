/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Swiss Modern Color Palette - Matching Reference Design
        'swiss-mint': '#48CFAE',
        'swiss-teal': '#227C9D', 
        'swiss-coral': '#FE6D73',
        'swiss-sand': '#F3D29E',
        'swiss-charcoal': '#2B2B2B',
        'swiss-gray': '#6B7280',
        'swiss-light-gray': '#F3F4F6',
        'swiss-white': '#FFFFFF',
        'page-bg': '#F9FAFB',
        
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
        'swiss': ['Nunito', 'Inter', 'system-ui', 'sans-serif'],
        'sans': ['Nunito', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        'button': '0.5rem',
        'card': '0.75rem',
        'input': '0.5rem',
      },
      boxShadow: {
        'soft': '0 4px 12px 0 rgba(0, 0, 0, 0.07)',
        'interactive': '0 2px 8px 0 rgba(0, 0, 0, 0.05)',
        'minimal': '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}