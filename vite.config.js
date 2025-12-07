import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../ssl/server.key')),
      cert: fs.readFileSync(path.resolve(__dirname, '../ssl/server.crt')),
    },
    headers: {
      // Allow eval in development (Vite uses it for HMR)
      'Content-Security-Policy': "script-src 'self' 'unsafe-eval' 'unsafe-inline'; object-src 'none';"
    }
  },
  define: {
    'process.env': process.env,
  },
  envPrefix: 'VITE_',
});
