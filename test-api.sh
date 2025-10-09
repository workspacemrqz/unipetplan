#!/bin/bash

# Test API endpoint for Gabriel Sena's installments

echo "==================================="
echo "Testing API for Gabriel Sena"
echo "==================================="

# Login as Gabriel Sena
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/clients/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gabrielsena@example.com",
    "cpf": "12345678913"
  }' \
  -c /tmp/cookies.txt)

if echo "$LOGIN_RESPONSE" | grep -q "success"; then
  echo "✅ Login successful"
else
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo ""
echo "2. Fetching contracts..."
CONTRACTS=$(curl -s http://localhost:3000/api/clients/contracts \
  -b /tmp/cookies.txt)

echo "Contracts found:"
echo "$CONTRACTS" | jq '.contracts[] | {petName: .petName, planName: .planName, status: .status}'

echo ""
echo "3. Fetching installments..."
INSTALLMENTS=$(curl -s http://localhost:3000/api/customer/installments \
  -b /tmp/cookies.txt)

echo "Current (Próximas) installments:"
echo "$INSTALLMENTS" | jq '.current[] | {petName: .petName, amount: .amount, dueDate: .dueDate, id: .id}'

echo ""
echo "Summary:"
echo "$INSTALLMENTS" | jq '{
  paidCount: (.paid | length),
  currentCount: (.current | length), 
  overdueCount: (.overdue | length)
}'

echo ""
echo "Looking for xiuau specifically:"
echo "$INSTALLMENTS" | jq '.current[] | select(.petName == "xiuau")'

