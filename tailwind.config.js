module.exports = {
  theme: {
    extend: {
      colors: {
        fluxa: {
          white: "var(--fluxa-white)",
          black: "var(--fluxa-black)",
          text: "var(--fluxa-text)",
          muted: "var(--fluxa-muted)",
          accent: "var(--fluxa-accent)",
          "accent-600": "var(--fluxa-accent-600)",
          violet: "var(--fluxa-violet)",
          reward: "var(--fluxa-reward)",
        },
      },
      boxShadow: {
        "fluxa-soft": "var(--fluxa-shadow-soft)",
        "fluxa-glow": "var(--fluxa-glow)",
      },
      fontFamily: {
        display: ["Poppins", "Inter", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["Roboto Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "xl-2": "16px",
      },
    },
  },
  plugins: [],
};
