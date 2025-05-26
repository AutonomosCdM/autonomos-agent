#!/bin/bash

# Script para probar el webhook de Slack localmente

echo "🚀 Testing Slack webhook..."

# Webhook URL
URL="http://localhost:3000/webhook/slack/events"

# Test event
curl -X POST $URL \
  -H "Content-Type: application/json" \
  -H "X-Slack-Request-Timestamp: $(date +%s)" \
  -d '{
    "type": "event_callback",
    "team_id": "T123456789",
    "event": {
      "type": "message",
      "channel": "C123456789",
      "user": "U987654321",
      "text": "Hey bot, can you help me?",
      "ts": "1234567890.123456"
    }
  }'

echo -e "\n✅ Request sent!"