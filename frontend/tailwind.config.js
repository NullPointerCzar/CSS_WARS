/** @type {import('tailwindcss').Config} */
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'oklch(0.16 0.005 270 / <alpha-value>)',
        foreground: 'oklch(0.96 0.003 270 / <alpha-value>)',

        surface: {
          1: 'oklch(0.18 0.006 270 / <alpha-value>)',
          2: 'oklch(0.21 0.006 270 / <alpha-value>)',
          3: 'oklch(0.25 0.006 270 / <alpha-value>)',
          4: 'oklch(0.30 0.006 270 / <alpha-value>)',
        },

        card: {
          DEFAULT: 'oklch(0.21 0.006 270 / <alpha-value>)',
          foreground: 'oklch(0.96 0.003 270 / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'oklch(0.25 0.006 270 / <alpha-value>)',
          foreground: 'oklch(0.96 0.003 270 / <alpha-value>)',
        },

        primary: {
          DEFAULT: 'oklch(0.78 0.16 65 / <alpha-value>)',
          foreground: 'oklch(0.18 0.01 65 / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'oklch(0.25 0.006 270 / <alpha-value>)',
          foreground: 'oklch(0.96 0.003 270 / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'oklch(0.25 0.006 270 / <alpha-value>)',
          foreground: 'oklch(0.68 0.005 270 / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'oklch(0.62 0.16 270 / <alpha-value>)',
          foreground: 'oklch(0.98 0 0 / <alpha-value>)',
        },

        destructive: {
          DEFAULT: 'oklch(0.65 0.22 25 / <alpha-value>)',
          foreground: 'oklch(0.98 0 0 / <alpha-value>)',
        },

        brand: {
          DEFAULT: 'oklch(0.78 0.16 65 / <alpha-value>)',
          foreground: 'oklch(0.18 0.01 65 / <alpha-value>)',
          soft: 'oklch(0.32 0.06 65 / <alpha-value>)',
        },
        success: {
          DEFAULT: 'oklch(0.72 0.16 155 / <alpha-value>)',
          soft: 'oklch(0.30 0.08 155 / <alpha-value>)',
          foreground: 'oklch(0.16 0.01 155 / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'oklch(0.78 0.14 75 / <alpha-value>)',
          soft: 'oklch(0.32 0.07 75 / <alpha-value>)',
          foreground: 'oklch(0.18 0.01 75 / <alpha-value>)',
        },
        info: {
          DEFAULT: 'oklch(0.65 0.14 230 / <alpha-value>)',
          soft: 'oklch(0.30 0.07 230 / <alpha-value>)',
          foreground: 'oklch(0.98 0 0 / <alpha-value>)',
        },

        border: 'oklch(1 0 0 / 8%)',
        'border-strong': 'oklch(1 0 0 / 14%)',
        input: 'oklch(1 0 0 / 10%)',
        ring: 'oklch(0.78 0.16 65 / <alpha-value>)',

        chart: {
          1: 'oklch(0.78 0.16 65 / <alpha-value>)',
          2: 'oklch(0.62 0.16 270 / <alpha-value>)',
          3: 'oklch(0.72 0.16 155 / <alpha-value>)',
          4: 'oklch(0.78 0.14 75 / <alpha-value>)',
          5: 'oklch(0.65 0.22 25 / <alpha-value>)',
        },
        sidebar: {
          DEFAULT: 'oklch(0.18 0.006 270 / <alpha-value>)',
          foreground: 'oklch(0.96 0.003 270 / <alpha-value>)',
          primary: 'oklch(0.78 0.16 65 / <alpha-value>)',
          'primary-foreground': 'oklch(0.18 0.01 65 / <alpha-value>)',
          accent: 'oklch(0.25 0.006 270 / <alpha-value>)',
          'accent-foreground': 'oklch(0.96 0.003 270 / <alpha-value>)',
          border: 'oklch(1 0 0 / 8%)',
          ring: 'oklch(0.78 0.16 65 / <alpha-value>)',
        },
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        'soft-sm': 'var(--shadow-sm)',
        'soft-md': 'var(--shadow-md)',
        'soft-lg': 'var(--shadow-lg)',
        focus: 'var(--shadow-focus)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      letterSpacing: {
        tightest: '-0.025em',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.18s ease-out',
        'slide-up': 'slide-up 0.22s ease-out',
        'scale-in': 'scale-in 0.18s ease-out',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
