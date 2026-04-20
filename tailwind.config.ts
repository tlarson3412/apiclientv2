import type { Config } from "tailwindcss";

export default {
  darkMode: 'class',
  content: ["./client/index.html", "./client/sidebar.html", "./client/editor.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: ".5rem",
        md: ".375rem",
        sm: ".1875rem",
      },
      colors: {
        /* Figma Design System Tokens */
        label: {
          vivid: "hsl(var(--label-vivid) / <alpha-value>)",
          mid: "hsl(var(--label-mid) / <alpha-value>)",
          muted: "hsl(var(--label-muted) / <alpha-value>)",
          white: "hsl(var(--label-white) / <alpha-value>)",
        },
        standard: {
          vivid: "hsl(var(--standard-vivid) / <alpha-value>)",
          subdued: "hsl(var(--standard-subdued) / <alpha-value>)",
          muted: "hsl(var(--standard-muted) / <alpha-value>)",
        },
        utility: {
          white: "hsl(var(--utility-white) / <alpha-value>)",
          vivid: "hsl(var(--utility-vivid) / <alpha-value>)",
          mid: "hsl(var(--utility-mid) / <alpha-value>)",
          subdued: "hsl(var(--utility-subdued) / <alpha-value>)",
          muted: "hsl(var(--utility-muted) / <alpha-value>)",
          overlay: "hsl(var(--utility-overlay) / 0.78)",
        },
        surface: {
          DEFAULT: "hsl(var(--surface) / <alpha-value>)",
          "alternate-muted": "hsl(var(--surface-alternate-muted) / <alpha-value>)",
        },
        disabled: {
          element: "hsl(var(--disabled-element) / 0.4)",
          foreground: "hsl(var(--disabled-foreground) / <alpha-value>)",
        },
        highlight: {
          subdued: "hsl(var(--highlight-subdued) / <alpha-value>)",
        },
        status: {
          "info-mid": "hsl(var(--status-info-mid) / <alpha-value>)",
          "info-muted": "hsl(var(--status-info-muted) / <alpha-value>)",
          "info-subdued": "hsl(var(--status-info-subdued) / <alpha-value>)",
          "success-mid": "hsl(var(--status-success-mid) / <alpha-value>)",
          "success-muted": "hsl(var(--status-success-muted) / <alpha-value>)",
          "success-subdued": "hsl(var(--status-success-subdued) / <alpha-value>)",
          "caution-mid": "hsl(var(--status-caution-mid) / <alpha-value>)",
          "caution-muted": "hsl(var(--status-caution-muted) / <alpha-value>)",
          "caution-subdued": "hsl(var(--status-caution-subdued) / <alpha-value>)",
          "danger-mid": "hsl(var(--status-danger-mid) / <alpha-value>)",
          "danger-muted": "hsl(var(--status-danger-muted) / <alpha-value>)",
          "danger-subdued": "hsl(var(--status-danger-subdued) / <alpha-value>)",
        },

        /* Semantic mappings for Shadcn compatibility */
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          border: "hsl(var(--card-border) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
          border: "hsl(var(--popover-border) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          border: "var(--primary-border)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
          border: "var(--secondary-border)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
          border: "var(--muted-border)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          border: "var(--accent-border)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
          border: "var(--destructive-border)",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
        },
        "sidebar-primary": {
          DEFAULT: "hsl(var(--sidebar-primary) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          border: "var(--sidebar-primary-border)",
        },
        "sidebar-accent": {
          DEFAULT: "hsl(var(--sidebar-accent) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "var(--sidebar-accent-border)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
