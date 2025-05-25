# Slack Setup Guide

## App Configuration

Tu Slack App "Dona" ya está configurada con:

- **Display Name**: MCPBot
- **Bot Scopes**: channels:history, chat:write, commands, etc.
- **Events**: app_mention, message.channels, message.groups, etc.
- **Slash Command**: `/ask-mcp`

## Getting the Bot Token

1. Go to https://api.slack.com/apps
2. Select your "Dona" app
3. Go to "OAuth & Permissions" in the sidebar
4. Copy the "Bot User OAuth Token" (starts with `xoxb-`)
5. Add to your `.env` file:
   ```
   SLACK_BOT_TOKEN=xoxb-your-token-here
   ```

## Installing the App

1. In your Slack App settings, go to "Install App"
2. Click "Install to Workspace"
3. Authorize the app
4. Make sure the bot is added to channel `#mejoras_autonomos`

## Testing the Integration

Run the test script:
```bash
cd /Users/autonomos_dev/Projects/autonomos/autonomos-agent
npx ts-node scripts/test-slack-api.ts
```

## How it Works

1. **Polling Mode**: System checks `#mejoras_autonomos` every 5 seconds
2. **Message Detection**: Finds new user messages
3. **AI Processing**: Uses Claude to generate responses
4. **Thread Replies**: Responds in the same thread
5. **Reactions**: Adds 🤖 emoji to processed messages

## Channel Configuration

- **Target Channel**: `#mejoras_autonomos` (ID: C08TV93SC8M)
- **Organization**: test-org (from seed data)
- **Polling Interval**: 5 seconds

## Commands

- **Start system**: `npm run dev`
- **Test connection**: `npx ts-node scripts/test-slack-api.ts`
- **View logs**: Check console output

## Troubleshooting

1. **Bot not responding**: Check token is correct and bot is in channel
2. **Permission errors**: Verify bot scopes in app settings
3. **Channel not found**: Ensure channel ID is correct (C08TV93SC8M)
4. **Database errors**: Make sure Supabase is running (`supabase start`)
5. **Queue errors**: Ensure Redis is running (`docker-compose up -d redis`)