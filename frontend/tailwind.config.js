/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        trade: {
          bg: "#0B0F19",
          card: "#111827",
          border: "#1F2937",
          hover: "#1E293B",
          accent: "#0284C7",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          muted: "#94A3B8",
          text: "#F8FAFC",
        }
      }
    },
  },
  plugins: [],
}
