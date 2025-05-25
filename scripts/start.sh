#!/bin/sh

echo "Starting Autonomos Agent..."

# Check if dist folder exists
if [ ! -d "dist" ]; then
  echo "Building application..."
  npm run build
fi

# Check required environment variables
if [ -z "$OPENROUTER_API_KEY" ]; then
  echo "Warning: OPENROUTER_API_KEY not set"
fi

if [ -z "$SLACK_BOT_TOKEN" ]; then
  echo "Warning: SLACK_BOT_TOKEN not set"
fi

# Start the application
echo "Starting Node.js server on port ${PORT:-10000}..."
exec node dist/index.js