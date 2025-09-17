/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Swiss Modern Color Palette - Admin (Light Theme with Different Shades)
        'admin-mint': '#0D9488',      // Slightly darker mint
        'admin-teal': '#0891B2',      // Slightly different teal
        'admin-coral': '#DC2626',     // Slightly different coral
        'admin-sand': '#CA8A04',      // Slightly different sand
        'admin-charcoal': '#475569',  // Slightly different charcoal
        'admin-gray': '#64748B',       // Slightly different gray
        'admin-light': '#F8FAFC',     // Very light background
        'admin-white': '#FFFFFF',     // Pure white
        
        // Admin Color Variations (Lighter shades)
        'admin-mint-light': '#CCFBF1',
        'admin-mint-dark': '#0F766E',
        'admin-teal-light': '#CFFAFE',
        'admin-teal-dark': '#0E7490',
        'admin-coral-light': '#FEE2E2',
        'admin-coral-dark': '#B91C1C',
        'admin-sand-light': '#FEF3C7',
        'admin-sand-dark': '#A16207',
        
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