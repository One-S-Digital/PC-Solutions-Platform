/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  corePlugins: {
    preflight: false, // Disable preflight to preserve mock styling
  },
  theme: {
    extend: {
      colors: {
        'swiss-mint': '#48CFAE',
        'swiss-sand': '#F3D29E',
        'swiss-coral': '#FE6D73',
        'swiss-teal': '#227C9D',
        'swiss-light-gray': '#F3F4F6',
        'swiss-charcoal': '#2B2B2B',
        'page-bg': '#F9FAFB',
      },
      fontFamily: {
        sans: ['Nunito', 'Inter', 'sans-serif'], // Prioritize Nunito to match mock
      },
      borderRadius: {
        'card': '0.75rem', // 12px to match mock
        'button': '0.5rem', // 8px to match mock
      },
      boxShadow: {
        'soft': '0 4px 12px 0 rgba(0, 0, 0, 0.07)',
        'interactive': '0 2px 8px 0 rgba(0, 0, 0, 0.05)',
        'minimal': '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      gridTemplateColumns: {
        'form-layout': '3fr 7fr', // For settings page: labels 30%, inputs 70%
      },
    },
  },
  plugins: [],
}