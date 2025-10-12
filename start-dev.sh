#!/bin/bash

# Script para iniciar frontend e backend simultaneamente no Replit

echo "🚀 Iniciando aplicação UNIPET PLAN..."

# Variável para rastrear se devemos fazer cleanup
CLEANING_UP=false

# Função para cleanup ao sair
cleanup() {
    if [ "$CLEANING_UP" = true ]; then
        return
    fi
    CLEANING_UP=true
    
    echo ""
    echo "🛑 Encerrando servidores..."
    # Mata todos os processos filhos
    pkill -P $$ 2>/dev/null || true
    exit "${1:-0}"
}

# Capturar sinais de interrupção
trap 'cleanup 130' SIGINT
trap 'cleanup 143' SIGTERM

# Iniciar backend em background
echo "📡 Iniciando backend na porta 3000..."
npm run dev &
BACKEND_PID=$!

# Aguardar um momento para o backend inicializar
sleep 3

# Iniciar frontend em background
echo "🎨 Iniciando frontend na porta 5000..."
(cd client && npm run dev -- --port 5000 --host 0.0.0.0) &
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
# Se qualquer um sair, encerra o outro
wait -n
EXIT_STATUS=$?

echo ""
echo "⚠️ Um dos servidores encerrou (status: $EXIT_STATUS)"
cleanup $EXIT_STATUS
