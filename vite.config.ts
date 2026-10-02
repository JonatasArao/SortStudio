import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'zustand',
        'lucide-react',
        'three',
        '@react-three/fiber',
        '@react-three/drei',
        'motion/react',
        'html-to-image',
        'idb-keyval',
        'react-virtuoso',
        'i18next',
        'react-i18next',
        'youtube-player',
      ],
    },
    build: {
      chunkSizeWarningLimit: 3000,
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three', '@react-three/fiber', '@react-three/drei'],
            vendor: ['react', 'react-dom', 'zustand', 'lucide-react']
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
