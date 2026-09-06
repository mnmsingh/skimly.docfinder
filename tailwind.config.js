/**
 * Returns a Tailwind color function backed by an "R G B" CSS custom
 * property, so utilities like `bg-primary` and `bg-primary/10` both work
 * and the color can be swapped per-theme just by redefining the variable.
 */
function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue === undefined) {
      return `rgb(var(${variableName}))`
    }
    return `rgb(var(${variableName}) / ${opacityValue})`
  }
}

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Small semantic design-token palette. Each is backed by a CSS
        // variable (see index.css) so the same class names automatically
        // repaint for light/dark mode — no separate dark: variants needed
        // for these. Tints (e.g. a light badge background) are expressed
        // with Tailwind's opacity modifier, e.g. `bg-primary/10`.
        primary: {
          DEFAULT: withOpacity('--color-primary'),
          hover: withOpacity('--color-primary-hover'),
        },
        surface: withOpacity('--color-surface'),
        background: withOpacity('--color-background'),
        border: {
          DEFAULT: withOpacity('--color-border'),
          strong: withOpacity('--color-border-strong'),
        },
        muted: withOpacity('--color-muted'),
        success: withOpacity('--color-success'),
        warning: withOpacity('--color-warning'),
        error: withOpacity('--color-error'),
      },
      borderRadius: {
        card: '0.625rem',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04)',
      },
    },
  },
  plugins: [],
}
