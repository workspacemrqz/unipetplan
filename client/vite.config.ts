import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Configurações de JSX
      jsxRuntime: 'automatic'
    })
  ],
  
  // Configurações de servidor de desenvolvimento
  server: {
    port: parseInt(process.env.VITE_PORT || '5000', 10),
    host: process.env.VITE_HOST || '0.0.0.0',
    open: false,
    allowedHosts: true,
    
    // Configurações de proxy para desenvolvimento
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        timeout: 60000,
        proxyTimeout: 60000,
        // Headers para keep-alive
        headers: {
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=60'
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[PROXY] Erro:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            proxyReq.setHeader('Connection', 'keep-alive');
          });
        }
      },
      '/admin/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        timeout: 60000,
        proxyTimeout: 60000,
        // Headers para keep-alive
        headers: {
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=60'
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[PROXY-ADMIN] Erro:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            proxyReq.setHeader('Connection', 'keep-alive');
          });
        }
      }
    },
    
    // Configurações de CORS para desenvolvimento
    cors: true,
    
    // Configurações de HTTPS (opcional)
    // https: false
  },
  
  // Configurações de preview
  preview: {
    port: 4173,
    host: true,
    open: true
  },
  
  // Configurações de resolução de módulos
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
      '@styles': resolve(__dirname, 'src/styles'),
      '@assets': resolve(__dirname, 'src/assets'),
      '@lib': resolve(__dirname, 'src/lib'),
      '@config': resolve(__dirname, 'src/config'),
      '@shared': resolve(__dirname, '../shared')
    }
  },
  
  // Configurações de CSS
  css: {
    // PostCSS
    postcss: './postcss.config.cjs',
    
    // Preprocessors
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  
  // Configurações de otimização
  optimizeDeps: {
    // Incluir dependências que precisam ser pré-bundladas
    include: [
      'react',
      'react-dom',
      'wouter',
      '@tanstack/react-query',
      'framer-motion',
      'lucide-react',
      'embla-carousel-react'
    ],
    
    // Excluir dependências que não devem ser pré-bundladas
    exclude: ['@vite/client', '@vite/env']
  },
  
  // Configurações de define
  define: {
    // Variáveis globais
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
    __TEST__: JSON.stringify(process.env.NODE_ENV === 'test'),
    
    // Versão da aplicação
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    
    // Timestamp de build
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },
  
  // Configurações de assets
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.webp'],
  
  // Configurações de worker
  worker: {
    format: 'es'
  },
  
  // Configurações de esbuild
  esbuild: {
    // Configurações de JSX
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    
    // Configurações de minificação
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true
  },
  

  
  // Configurações de ambiente
  envPrefix: ['VITE_', 'REACT_APP_'],
  
  // Configurações de cache
  cacheDir: 'node_modules/.vite',
  
  // Configurações de log
  logLevel: 'info',
  
  // Configurações de clearScreen
  clearScreen: false,
  
  // Configurações de base
  base: '/',
  
  // Configurações de publicDir
  publicDir: 'public',
  
  // Configurações de build para copiar assets
  build: {
    // Configuração de saída para produção
    outDir: '../dist/client',
    // Otimizações de produção
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
    
    // Configurações de rollup
    rollupOptions: {
      output: {
        // Separar vendor chunks para melhor cache
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          utils: ['clsx', 'tailwind-merge', 'class-variance-authority']
        },
        
        // Nomes de arquivo consistentes
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // Otimizações de tamanho
    chunkSizeWarningLimit: 1000,
    
    // Configurações de terser
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    
    // Garantir que arquivos da pasta public sejam copiados
    copyPublicDir: true
  },
  
  // Configurações de root
  root: process.cwd(),
  
  // Configurações de mode
  mode: process.env.NODE_ENV || 'development'
});
