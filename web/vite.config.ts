import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import netlifyPlugin from '@netlify/vite-plugin-tanstack-start'

const config = defineConfig({
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    // Only use Netlify plugin in production builds
    ...(process.env.NODE_ENV === 'production' ? [netlifyPlugin()] : []),
    viteReact(),
  ],
  server: {
    port: 3001,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Skip node_modules that aren't actual dependencies
          if (!id.includes('node_modules')) {
            return undefined;
          }

          // UI components library - split Radix UI into separate chunk
          if (id.includes('@radix-ui')) {
            return 'ui-radix';
          }

          // DnD kit for drag and drop
          if (id.includes('@dnd-kit')) {
            return 'dnd-kit';
          }

          // Convex - split auth-related modules into separate chunk
          if (id.includes('convex')) {
            // Keep auth-related Convex modules separate to avoid circular dependency issues
            if (id.includes('@convex-dev/better-auth')) {
              return 'auth-vendor';
            }
            if (id.includes('@convex-dev/react-query')) {
              return 'convex-react';
            }
            // Don't bundle _generated files with other convex files
            if (id.includes('_generated')) {
              return 'convex-generated';
            }
            return 'convex-vendor';
          }

          if (id.includes('better-auth')) {
            return 'auth-vendor';
          }

          // Utilities
          if (
            id.includes('date-fns') ||
            id.includes('clsx') ||
            id.includes('tailwind-merge') ||
            id.includes('class-variance-authority') ||
            id.includes('zod') ||
            id.includes('zustand')
          ) {
            return 'utils';
          }

          // Lucide icons
          if (id.includes('lucide-react')) {
            return 'icons';
          }

          // Markdown and sanitization
          if (id.includes('marked') || id.includes('dompurify')) {
            return 'markdown';
          }

          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/convex/_generated/**',
      ],
    },
  },
})

export default config
