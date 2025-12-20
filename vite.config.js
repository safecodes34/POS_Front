import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: '0.0.0.0', // Allow access from other devices on the network
    // Only use HTTPS in development if SSL certs exist
    ...(fs.existsSync(path.resolve(__dirname, '../ssl/server.key')) && 
        fs.existsSync(path.resolve(__dirname, '../ssl/server.crt')) ? {
      https: {
        key: fs.readFileSync(path.resolve(__dirname, '../ssl/server.key')),
        cert: fs.readFileSync(path.resolve(__dirname, '../ssl/server.crt')),
      },
    } : {}),
    hmr: {
      // Increase timeout for large files
      timeout: 30000,
      // Overlay errors in browser
      overlay: true
    },
    headers: {
      // Allow eval in development (Vite uses it for HMR)
      // Allow Stripe scripts and API connections
      // Allow all HTTPS connections for local network access (192.168.x.x, 10.x.x.x, etc.)
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://js.stripe.com/v3/ https://js.stripe.com/terminal/v1 blob: data:; script-src-elem 'self' 'unsafe-inline' https://js.stripe.com https://js.stripe.com/v3/ https://js.stripe.com/terminal/v1; style-src 'self' 'unsafe-inline' https://js.stripe.com; connect-src 'self' https: http: https://api.stripe.com https://posback-production-2407.up.railway.app blob: wss: ws:; img-src 'self' data: https: blob:; font-src 'self' data: https://js.stripe.com; frame-src 'self' https://js.stripe.com https://hooks.stripe.com; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self' https://js.stripe.com;"
    }
  },
  preview: {
    port: 3001,
    host: '0.0.0.0', // Allow access from other devices on the network
    // Only use HTTPS in preview if SSL certs exist
    ...(fs.existsSync(path.resolve(__dirname, '../ssl/server.key')) && 
        fs.existsSync(path.resolve(__dirname, '../ssl/server.crt')) ? {
      https: {
        key: fs.readFileSync(path.resolve(__dirname, '../ssl/server.key')),
        cert: fs.readFileSync(path.resolve(__dirname, '../ssl/server.crt')),
      },
    } : {}),
    headers: {
      // Allow eval in preview (Vite uses it for HMR)
      // Allow Stripe scripts and API connections
      // Allow all HTTPS connections for local network access (192.168.x.x, 10.x.x.x, etc.)
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://js.stripe.com/v3/ https://js.stripe.com/terminal/v1 blob: data:; script-src-elem 'self' 'unsafe-inline' https://js.stripe.com https://js.stripe.com/v3/ https://js.stripe.com/terminal/v1; style-src 'self' 'unsafe-inline' https://js.stripe.com; connect-src 'self' https: http: https://api.stripe.com https://posback-production-2407.up.railway.app blob: wss: ws:; img-src 'self' data: https: blob:; font-src 'self' data: https://js.stripe.com; frame-src 'self' https://js.stripe.com https://hooks.stripe.com; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self' https://js.stripe.com;"
    }
  },
  define: {
    'process.env': process.env,
  },
  envPrefix: 'VITE_',
  // Ensure SPA routing works - all routes fall back to index.html
  appType: 'spa',
  build: {
    // Increase chunk size warning limit to 1000KB (1MB)
    // This is reasonable for apps with Stripe, React Router, and other libraries
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Separate vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'stripe-vendor': ['@stripe/stripe-js', '@stripe/react-stripe-js', '@stripe/terminal-js'],
        },
      },
    },
  },
});
