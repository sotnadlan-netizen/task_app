import type { Config } from "tailwindcss";

export default {
  darkMode: 'class',
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    // Explicit responsive breakpoints for clarity and mobile-first design
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Arial', 'sans-serif'],
        hebrew: ['"Assistant"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      // Custom font size scale — base body text at 18px (text-lg equivalent)
      fontSize: {
        // Accessible minimum sizes
        'xs':   ['0.75rem',  { lineHeight: '1.25rem' }],   // 12px — use sparingly
        'sm':   ['0.875rem', { lineHeight: '1.375rem' }],  // 14px
        'base': ['1.125rem', { lineHeight: '1.75rem' }],   // 18px — new default body size
        'lg':   ['1.25rem',  { lineHeight: '1.875rem' }],  // 20px
        'xl':   ['1.375rem', { lineHeight: '1.875rem' }],  // 22px
        '2xl':  ['1.5rem',   { lineHeight: '2rem' }],      // 24px
        '3xl':  ['1.875rem', { lineHeight: '2.25rem' }],   // 30px
        '4xl':  ['2.25rem',  { lineHeight: '2.5rem' }],    // 36px
        '5xl':  ['3rem',     { lineHeight: '1' }],
        '6xl':  ['3.75rem',  { lineHeight: '1' }],
      },
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'neu': '4px 4px 10px oklch(0.82 0.01 140 / 0.4), -4px -4px 10px oklch(0.99 0.005 100 / 0.9)',
        'neu-dark': '4px 4px 10px oklch(0.10 0.01 240 / 0.6), -3px -3px 8px oklch(0.25 0.01 240 / 0.4)',
        'neu-inset': 'inset 2px 2px 6px oklch(0.82 0.01 140 / 0.35), inset -2px -2px 6px oklch(0.99 0.005 100 / 0.8)',
        'glass': '0 8px 32px oklch(0.18 0.01 240 / 0.12), 0 2px 8px oklch(0.18 0.01 240 / 0.06)',
        'glass-hover': '0 12px 40px oklch(0.18 0.01 240 / 0.18), 0 4px 12px oklch(0.18 0.01 240 / 0.10)',
        'card': '0 1px 3px oklch(0.18 0.01 240 / 0.06), 0 1px 2px oklch(0.18 0.01 240 / 0.04)',
        'card-hover': '0 4px 16px oklch(0.18 0.01 240 / 0.10), 0 2px 4px oklch(0.18 0.01 240 / 0.06)',
        'elevated': '0 8px 24px oklch(0.18 0.01 240 / 0.12), 0 2px 6px oklch(0.18 0.01 240 / 0.06)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)", filter: "blur(4px)" },
          to: { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "waveform-pulse": {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
        "mic-aura": {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.6' },
          '50%': { transform: 'scale(1.4)', opacity: '0' },
        },
        "shimmer": {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-in-right": "slide-in-right 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "waveform-pulse": "waveform-pulse 1.2s ease-in-out infinite",
        "mic-aura": "mic-aura 2s ease-out infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      direction: {
        rtl: 'rtl',
        ltr: 'ltr',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
