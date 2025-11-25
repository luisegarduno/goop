/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#1a1a1a",
          text: "#e0e0e0",
          user: "#4fc3f7",
          assistant: "#81c784",
          tool: "#ffb74d",
        },
      },
      fontFamily: {
        mono: ["Monaco", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};