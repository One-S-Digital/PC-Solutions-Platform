import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Swiss Theme Colors
        accent: 'var(--accent)',
        'accent-contrast': 'var(--accent-contrast)',
        danger: 'var(--danger)',
        warn: 'var(--warn)',
        success: 'var(--success)',
        
        // Surface Colors
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)'
        },
        
        // Text Colors
        text: {
          strong: 'var(--text-strong)',
          DEFAULT: 'var(--text-default)',
          muted: 'var(--text-muted)',
          subtle: 'var(--text-subtle)'
        },
        
        // Border Colors
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)'
        },
        
        // Swiss Brand Colors
        'swiss-mint': 'var(--swiss-mint)',
        'swiss-sand': 'var(--swiss-sand)',
        'swiss-coral': 'var(--swiss-coral)',
        'swiss-teal': 'var(--swiss-teal)',
        'swiss-light': 'var(--swiss-light)',
        'swiss-charcoal': 'var(--swiss-charcoal)',
        
        // Brand Primary Colors
        primary: {
          50: 'var(--brand-primary-50)',
          100: 'var(--brand-primary-100)',
          200: 'var(--brand-primary-200)',
          300: 'var(--brand-primary-300)',
          400: 'var(--brand-primary-400)',
          500: 'var(--brand-primary-500)',
          600: 'var(--brand-primary-600)',
          700: 'var(--brand-primary-700)',
          800: 'var(--brand-primary-800)',
          900: 'var(--brand-primary-900)',
        }
      },
      
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        full: 'var(--radius-full)'
      },
      
      boxShadow: {
        soft: 'var(--shadow-soft)',
        float: 'var(--shadow-float)',
        pop: 'var(--shadow-pop)',
        inset: 'var(--shadow-inset)'
      },
      
      ringColor: { 
        DEFAULT: 'var(--ring)' 
      },
      
      ringOffsetColor: { 
        DEFAULT: 'transparent' 
      },
      
      backgroundImage: {
        'noise': 'var(--bg-noise)',
        'accent-mesh': 'var(--bg-accent-mesh)',
        'stripe-accent': 'linear-gradient(90deg, var(--accent) 0 3px, transparent 3px)',
        'top-gloss': 'linear-gradient(to bottom, rgba(255,255,255,.6), rgba(255,255,255,0))'
      },
      
      fontFamily: {
        sans: 'var(--font-sans)',
      },
      
      lineHeight: {
        tight: 'var(--leading-tight)',
        normal: 'var(--leading-normal)',
      },
      
      keyframes: {
        'fade-in': { 
          from: { opacity: '0' }, 
          to: { opacity: '1' } 
        },
        'slide-up': { 
          from: { transform: 'translateY(6px)', opacity: '0' }, 
          to: { transform: 'translateY(0)', opacity: '1' } 
        },
        'pulse-slow': { 
          '0%, 100%': { opacity: '1' }, 
          '50%': { opacity: '.6' } 
        }
      },
      
      animation: {
        'fade-in': 'fade-in var(--dur-200) var(--ease-standard) both',
        'slide-up': 'slide-up var(--dur-200) var(--ease-standard) both',
        'pulse-slow': 'pulse-slow 2.4s ease-in-out infinite'
      },
      
      transitionDuration: {
        '100': 'var(--dur-100)',
        '150': 'var(--dur-150)',
        '200': 'var(--dur-200)',
        '300': 'var(--dur-300)',
        '500': 'var(--dur-500)',
      },
      
      transitionTimingFunction: {
        'standard': 'var(--ease-standard)',
        'emph': 'var(--ease-emph)',
      }
    }
  },
  plugins: [
    function({ addVariant, addUtilities }: any) {
      // Custom variants
      addVariant('hocus', ['&:hover', '&:focus-visible'])
      addVariant('pressed', '&:active')
      addVariant('aria-expanded', '&[aria-expanded="true"]')
      addVariant('aria-checked', '&[aria-checked="true"]')
      
      // Custom utilities
      addUtilities({
        '.lift': {
          transition: 'transform var(--dur-150) var(--ease-standard), box-shadow var(--dur-150) var(--ease-standard)',
          '&:hover': {
            transform: 'translateY(-2px)',
            'box-shadow': 'var(--shadow-float)'
          }
        },
        '.press': {
          '&:active': {
            transform: 'translateY(0)',
            'box-shadow': 'var(--shadow-inset)'
          }
        },
        '.focus-ring': {
          outline: 'none',
          'box-shadow': '0 0 0 3px var(--ring)'
        },
        '.page-bg': {
          'background-image': 'var(--bg-noise), var(--bg-accent-mesh)',
          'background-color': 'var(--surface-0)'
        },
        '.card-accent': {
          position: 'relative',
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          'border-radius': 'var(--radius-md)',
          'box-shadow': 'var(--shadow-soft)',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: '0 auto 0 0',
            width: '3px',
            background: 'var(--accent)',
            'border-top-left-radius': 'var(--radius-md)',
            'border-bottom-left-radius': 'var(--radius-md)'
          }
        },
        '.notch-tr': {
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '0',
            right: '0',
            width: '12px',
            height: '12px',
            background: 'linear-gradient(135deg, transparent 49%, var(--surface-1) 50%)'
          }
        }
      })
    }
  ]
} satisfies Config