// vite.out.config.js
import {defineConfig} from 'vite';

export default defineConfig({
    root: './docs', // Serve from this directory
    server: {
        port: 5174, // Different port to avoid conflict
        strictPort: true,
    },
});
