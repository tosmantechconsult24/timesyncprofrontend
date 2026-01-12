import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Load env variables based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    // Define environment variables
    define: {
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(
        env.VITE_BACKEND_URL || 'https://timesyncprobackend.onrender.com'
      ),
      'import.meta.env.VITE_FINGERPRINT_SERVICE_URL': JSON.stringify(
        env.VITE_FINGERPRINT_SERVICE_URL || 'http://localhost:8080'
      ),
    },
    server: {
      port: 5173,
      // Proxy only needed for local development
      proxy: mode === 'development' ? {
        '/api': {
          target: env.VITE_BACKEND_URL || 'https://timesyncprobackend.onrender.com',
          changeOrigin: true,
        },
        '/uploads': {
          target: env.VITE_BACKEND_URL || 'https://timesyncprobackend.onrender.com',
          changeOrigin: true,
        },
        '/socket.io': {
          target: env.VITE_BACKEND_URL || 'https://timesyncprobackend.onrender.com',
          changeOrigin: true,
          ws: true,
        },
      } : undefined,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      // Optimize for production
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: false, // Keep console for debugging in kiosk
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            mui: ['@mui/material', '@mui/icons-material'],
            charts: ['recharts'],
          },
        },
      },
    },
  };
});