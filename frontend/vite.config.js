import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// /api calls are forwarded to the Express backend (see backend/.env PORT)
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:5000' } },
});
