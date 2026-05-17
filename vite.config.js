import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: true,          // écoute sur toutes les interfaces
    allowedHosts: true,  // autorise tous les hosts (Vite 7)
    proxy: {
      // tout ce qui commence par /api sera redirigé vers le backend
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      // Sales Dashboard (grossiste) servi par Express en statique
      '/grossiste': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

