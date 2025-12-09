import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    // Only use HTTPS in development if SSL certs exist
    ...(fs.existsSync(path.resolve(__dirname, '../ssl/server.key')) && 
        fs.existsSync(path.resolve(__dirname, '../ssl/server.crt')) ? {
      https: {
        key: fs.readFileSync(path.resolve(__dirname, '../ssl/server.key')),
        cert: fs.readFileSync(path.resolve(__dirname, '../ssl/server.crt')),
      },
    } : {}),
    headers: {
      // Allow eval in development (Vite uses it for HMR)
      // Allow Stripe scripts and API connections
      'Content-Security-Policy': "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://js.stripe.com/v3/ https://js.stripe.com/terminal/v1; script-src-elem 'self' 'unsafe-inline' https://js.stripe.com https://js.stripe.com/v3/ https://js.stripe.com/terminal/v1; connect-src 'self' https://localhost:4001 https://api.stripe.com; object-src 'none';"
    }
  },
  preview: {
    port: 3001,
    // Only use HTTPS in preview if SSL certs exist
    ...(fs.existsSync(path.resolve(__dirname, '../ssl/server.key')) && 
        fs.existsSync(path.resolve(__dirname, '../ssl/server.crt')) ? {
      https: {
        key: fs.readFileSync(path.resolve(__dirname, '../ssl/server.key')),
        cert: fs.readFileSync(path.resolve(__dirname, '../ssl/server.crt')),
      },
    } : {}),
  },
  define: {
    'process.env': process.env,
  },
  envPrefix: 'VITE_',
  // Ensure SPA routing works - all routes fall back to index.html
  appType: 'spa',
});
