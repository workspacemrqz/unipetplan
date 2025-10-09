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
  # Try to list the error
fi

echo ""
echo "2. Fetching contracts..."
CONTRACTS=$(curl -s http://localhost:3000/api/clients/contracts \
  -b /tmp/cookies.txt)

echo "Contracts response:"
echo "$CONTRACTS" | head -50

echo ""
echo "3. Fetching installments..."
INSTALLMENTS=$(curl -s http://localhost:3000/api/customer/installments \
  -b /tmp/cookies.txt)

echo "Installments response (first 100 chars):"
echo "$INSTALLMENTS" | head -c 500

