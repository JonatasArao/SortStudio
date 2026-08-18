const fs = require('fs');

let content = fs.readFileSync('vite.config.ts', 'utf8');

if (!content.includes('chunkSizeWarningLimit')) {
  content = content.replace(
    'server: {',
    `build: {
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
    server: {`
  );
  fs.writeFileSync('vite.config.ts', content);
}
