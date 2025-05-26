#!/bin/bash

# Script para probar el webhook de WhatsApp localmente

echo "🚀 Testing WhatsApp webhook..."

# Webhook URL
URL="http://localhost:3000/webhook/whatsapp/test-company"

# Test data
curl -X POST $URL \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp%3A%2B5491123456789" \
  -d "To=%2B14155238886" \
  -d "Body=Hola%2C%20necesito%20ayuda%20con%20mi%20pedido" \
  -d "MessageSid=SM1234567890abcdef" \
  -d "ProfileName=Juan%20Perez"

echo -e "\n✅ Request sent!"