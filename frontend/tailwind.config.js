/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'swiss-mint': '#48CFAE',
        'swiss-sand': '#F3D29E',
        'swiss-coral': '#FE6D73',
        'swiss-teal': '#227C9D',
        'swiss-deep-teal': '#1A5F7A',
        'swiss-light-gray': '#F3F4F6',
        'swiss-charcoal': '#2B2B2B',
        'page-bg': '#F9FAFB',
      },
      fontFamily: {
        sans: ['Nunito', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        'card': '0.75rem',
        'button': '0.5rem',
      },
      boxShadow: {
        'soft': '0 4px 12px 0 rgba(0, 0, 0, 0.07)',
        'interactive': '0 2px 8px 0 rgba(0, 0, 0, 0.05)',
        'minimal': '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      },
      gridTemplateColumns: {
        'form-layout': '3fr 7fr',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}