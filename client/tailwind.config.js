
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './index.html'
  ],
  theme: {
    extend: {
      // Mapeamento dos tokens shadcn/ui para CSS variables em cores.css
      colors: {
        // Tokens base
        border: 'rgb(var(--border))',
        input: 'rgb(var(--input))',
        popover: 'rgb(var(--popover))',
        'popover-foreground': 'rgb(var(--popover-foreground))', 
        ring: 'rgb(var(--ring))',
        background: 'rgb(var(--background))',
        foreground: 'rgb(var(--foreground))',
        
        // Tokens de componentes
        primary: {
          DEFAULT: 'rgb(var(--primary))',
          foreground: 'rgb(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary))',
          foreground: 'rgb(var(--secondary-foreground))'
        },
        accent: {
          DEFAULT: 'rgb(var(--accent))',
          foreground: 'rgb(var(--accent-foreground))'
        },
        muted: {
          DEFAULT: 'rgb(var(--muted))',
          foreground: 'rgb(var(--muted-foreground))'
        },
        destructive: {
          DEFAULT: 'rgb(var(--destructive))',
          foreground: 'rgb(var(--destructive-foreground))'
        },
        
        // Mantém cores personalizadas do projeto via variáveis existentes
        'teal': 'rgb(var(--primary))',
        'teal-light': 'rgb(var(--accent))', 
        'teal-dark': 'rgb(var(--teal-dark))',
        'cream-light': 'rgb(var(--muted))',
        'cream-lighter': 'rgb(var(--background))',
        'beige': 'rgb(var(--secondary))',
        'gold': 'rgb(var(--gold))',
        'gold-darker': 'rgb(var(--gold-darker))',
        
        // Status colors - CSS variables for alerts and feedback
        'success': 'rgb(var(--success))',
        'warning': 'rgb(var(--warning))',
        'error': 'rgb(var(--error))',
        'success-background': 'rgb(var(--success-background))',
        'warning-background': 'rgb(var(--warning-background))',
        'error-background': 'rgb(var(--error-background))',
        'success-foreground': 'rgb(var(--success-foreground))',
        'warning-foreground': 'rgb(var(--warning-foreground))',
        'error-foreground': 'rgb(var(--error-foreground))'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
        serif: ['Georgia', 'ui-serif', 'serif'],
        mono: ['Menlo', 'ui-monospace', 'monospace']
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem'
      },
      screens: {
        'xs': '475px',
        'lg': '1024px',
        '3xl': '1920px'
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-out': 'fadeOut 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-out': 'slideOut 0.3s ease-out'
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        'lg': 'var(--radius)',
        'md': 'calc(var(--radius) - 2px)',
        'sm': 'calc(var(--radius) - 4px)'
      },
      // Background images use CSS variables from cores.css
      backgroundImage: {}
    }
  },
  plugins: [],
  safelist: [
    // Cores principais do projeto
    'bg-primary',
    'bg-secondary', 
    'bg-accent',
    'text-primary',
    'text-secondary',
    'text-accent',
    'border-primary',
    'border-secondary',
    'border-accent',
    
    // Estados hover/focus
    'hover:bg-primary',
    'hover:bg-secondary',
    'hover:bg-accent',
    'focus:border-primary',
    
    
    // Classes de formulário
    'contact-form-field',
    'mobile-form-input',
    
    // Classes de animação
    'animate-fade-in-up',
    'animate-fade-in-down',
    'animate-fade-in-left',
    'animate-fade-in-right',
    'animate-scale-in',
    'animate-rotate-in',
    
    // Classes de layout responsivo
    'page-content',
    'section-container', 
    'container',
    'max-w-6xl',
    'mx-auto',
    'pt-16',
    'pt-32',
    'pb-20'
  ]
}
