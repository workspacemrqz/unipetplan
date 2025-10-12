#!/bin/bash

# Script para iniciar frontend e backend simultaneamente no Replit

echo "🚀 Iniciando aplicação UNIPET PLAN..."

# Função para cleanup ao sair
cleanup() {
    echo ""
    echo "🛑 Encerrando servidores..."
    kill 0
    exit 0
}

# Capturar sinais de interrupção
trap cleanup SIGINT SIGTERM

# Iniciar backend em background
echo "📡 Iniciando backend na porta 3000..."
npm run dev &
BACKEND_PID=$!

# Aguardar um momento para o backend inicializar
sleep 3

# Iniciar frontend em background
echo "🎨 Iniciando frontend na porta 5000..."
cd client && npm run dev -- --port 5000 --host 0.0.0.0 &
FRONTEND_PID=$!

echo ""
echo "✅ Aplicação iniciada com sucesso!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📡 Backend:  http://localhost:3000"
echo "🎨 Frontend: http://localhost:5000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Pressione Ctrl+C para encerrar"

# Aguardar ambos os processos
wait
