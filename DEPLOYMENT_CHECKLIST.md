# Deployment Checklist for Render

## Prerequisites
- [x] GitHub repository connected to Render
- [x] Supabase Cloud project created
- [x] Slack app created with proper permissions
- [x] OpenRouter API key
- [x] Twilio account (optional for WhatsApp)

## Environment Variables Required

### Core Configuration
- `NODE_ENV`: production
- `PORT`: 10000

### AI Service
- `OPENROUTER_API_KEY`: Your OpenRouter API key

### Slack Configuration
- `SLACK_BOT_TOKEN`: Bot User OAuth Token (xoxb-...)
- `SLACK_CLIENT_ID`: App Client ID
- `SLACK_CLIENT_SECRET`: App Client Secret
- `SLACK_SIGNING_SECRET`: App Signing Secret

### Supabase Configuration
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_KEY`: Supabase service role key

### Twilio Configuration (Optional)
- `TWILIO_ACCOUNT_SID`: Twilio Account SID
- `TWILIO_AUTH_TOKEN`: Twilio Auth Token
- `TWILIO_WHATSAPP_NUMBER`: WhatsApp number (format: whatsapp:+1234567890)

### Redis Configuration
- `REDIS_URL`: Automatically provided by Render when Redis service is linked

## Deployment Steps

1. **Create Services in Render**
   - Web Service: autonomos-agent
   - Redis Service: autonomos-redis

2. **Link Redis to Web Service**
   - In Web Service settings, go to "Environment"
   - Ensure REDIS_URL is automatically populated

3. **Add Environment Variables**
   - Add all variables listed above to the Web Service

4. **Run Database Migrations**
   - Execute migrations in Supabase SQL Editor
   - Run seed data to create initial organization

5. **Configure Slack Webhooks**
   - Update Slack app URLs to point to Render domain
   - Event URL: https://your-app.onrender.com/webhook/slack/events
   - Slash Commands: https://your-app.onrender.com/slack/command

6. **Deploy**
   - Push to main branch to trigger deployment
   - Monitor logs for any errors

## Health Check
- Visit: https://your-app.onrender.com/health
- Should return: { "status": "ok", "timestamp": "..." }

## Troubleshooting

### Redis Connection Errors
- Ensure Redis service is running
- Check REDIS_URL is properly set
- Verify Redis service is linked to web service

### Database Errors
- Verify Supabase credentials
- Ensure migrations have been run
- Check RLS policies are properly configured

### Slack Not Responding
- Verify bot token is correct
- Check webhook URLs are updated
- Ensure app is installed in workspace