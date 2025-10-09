#!/bin/bash

# Test API endpoint for Gabriel Sena's installments

echo "==================================="
echo "Testing API for Gabriel Sena"  
echo "==================================="

# Login as Gabriel Sena using correct email and CPF as password
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/clients/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gabriel1000@gmail.com",
    "password": "95550344190"
  }' \
  -c /tmp/cookies.txt)

if echo "$LOGIN_RESPONSE" | grep -q "success"; then
  echo "✅ Login successful"
  echo "$LOGIN_RESPONSE" | jq '.client.fullName'
else
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE"
fi

echo ""
echo "2. Fetching contracts..."
CONTRACTS=$(curl -s http://localhost:3000/api/clients/contracts \
  -b /tmp/cookies.txt)

echo "Contracts found:"
echo "$CONTRACTS" | jq -c '.contracts[] | {petName, planName, status, billingPeriod}'

echo ""
echo "3. Fetching installments..."
INSTALLMENTS=$(curl -s http://localhost:3000/api/customer/installments \
  -b /tmp/cookies.txt)

echo ""
echo "Summary:"
echo "$INSTALLMENTS" | jq '{
  paidCount: (.paid | length),
  currentCount: (.current | length), 
  overdueCount: (.overdue | length)
}'

echo ""
echo "Current (Next) installments:"
echo "$INSTALLMENTS" | jq -c '.current[] | {petName, amount, dueDate, id}'

echo ""
echo "Looking for xiuau specifically in current installments:"
XIUAU=$(echo "$INSTALLMENTS" | jq '.current[] | select(.petName == "xiuau")')
if [ -z "$XIUAU" ]; then
  echo "❌ xiuau NOT FOUND in current installments (this is the bug!)"
else
  echo "✅ xiuau FOUND in current installments:"
  echo "$XIUAU" | jq '.'
fi

