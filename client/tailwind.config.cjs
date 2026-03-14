module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        paw: {
          bg: '#09090b',
          surface: '#0f0f12',
          raised: '#18181b',
          overlay: '#27272a',
          'border-subtle': 'rgba(255,255,255,0.05)',
          border: 'rgba(255,255,255,0.09)',
          'border-strong': 'rgba(255,255,255,0.16)',
          text: '#fafafa',
          muted: '#a1a1aa',
          faint: '#52525b',
          accent: '#7c3aed',
          'accent-h': '#8b5cf6',
          'accent-d': '#6d28d9',
          'accent-bg': 'rgba(124,58,237,0.12)',
          success: '#22c55e',
          warning: '#f59e0b',
          danger: '#ef4444',
          info: '#3b82f6',
          'success-bg': 'rgba(34,197,94,0.12)',
          'warning-bg': 'rgba(245,158,11,0.12)',
          'danger-bg': 'rgba(239,68,68,0.12)',
          'info-bg': 'rgba(59,130,246,0.12)',
        },
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '24px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.4)',
        DEFAULT: '0 4px 16px rgba(0,0,0,0.4)',
        lg: '0 8px 32px rgba(0,0,0,0.5)',
        xl: '0 16px 64px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(124,58,237,0.3), 0 8px 32px rgba(124,58,237,0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        'slide-in-right': 'slideInRight 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-dots': 'bounceDots 1.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        bounceDots: {
          '0%,80%,100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
