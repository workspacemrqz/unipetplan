#!/usr/bin/env tsx

import express from 'express';
import { spawn } from 'child_process';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 5000;

console.log('🚀 Iniciando servidor unificado UNIPET PLAN...');

// Iniciar backend
console.log('📡 Iniciando backend na porta 3000...');
const backend = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Aguardar backend inicializar
await new Promise(resolve => setTimeout(resolve, 5000));

// Iniciar Vite (frontend)
console.log('🎨 Iniciando Vite na porta 3001...');
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: './client',
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, VITE_PORT: '3001' }
});

// Aguardar Vite inicializar
await new Promise(resolve => setTimeout(resolve, 3000));

// Proxy para API (backend)
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true
}));

app.use('/admin/api', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true
}));

// Proxy para frontend (Vite)
app.use('/', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  ws: true
}));

// Iniciar servidor unificado
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('✅ Servidor unificado iniciado com sucesso!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🌐 Acesse: http://0.0.0.0:${PORT}`);
  console.log('📡 Backend:  http://localhost:3000');
  console.log('🎨 Frontend: http://localhost:3001');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
});

// Cleanup ao sair
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando servidores...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  backend.kill();
  frontend.kill();
  process.exit(0);
});
