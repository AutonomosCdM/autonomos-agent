# Render Deployment Guide

## Prerequisites

1. GitHub repository with the code
2. Render account
3. Supabase project (cloud)
4. API keys ready

## Step 1: Create Supabase Cloud Project

1. Go to https://supabase.com
2. Create new project
3. Wait for setup to complete
4. Go to Settings > API
5. Copy:
   - Project URL
   - Anon public key  
   - Service role key

## Step 2: Deploy to Render

### Option A: Using Dashboard

1. Go to https://render.com
2. Connect GitHub account
3. Create new "Web Service"
4. Select repository: `autonomos-agent`
5. Configure:
   - **Name**: autonomos-agent
   - **Runtime**: Node
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Starter ($7/month)

### Option B: Using render.yaml (Recommended)

1. Push code with `render.yaml` to GitHub
2. In Render dashboard, create "Blueprint"
3. Connect to repository
4. Render will auto-detect `render.yaml`

## Step 3: Set Environment Variables

In Render dashboard, add these environment variables:

### Required Variables:
```
NODE_ENV=production
PORT=10000
OPENROUTER_API_KEY=sk-or-v1-...
SLACK_BOT_TOKEN=xoxb-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...
```

### Redis (Auto-provisioned):
```
REDIS_URL=redis://... (auto-generated)
```

### Optional (for WhatsApp):
```
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
SLACK_CLIENT_ID=placeholder
SLACK_CLIENT_SECRET=placeholder
SLACK_SIGNING_SECRET=placeholder
```

## Step 4: Setup Supabase Database

1. In Supabase dashboard, go to SQL Editor
2. Run migrations in order:
   - `supabase/migrations/20250525000001_initial_schema.sql`
   - `supabase/migrations/20250525000002_rls_policies.sql`
   - `supabase/migrations/20250525000003_functions.sql`
3. Run seed data: `supabase/seed.sql`

## Step 5: Configure Slack App

Update your Slack app URLs to point to Render:

1. Go to https://api.slack.com/apps
2. Select your "Dona" app
3. Update URLs:
   - **Event Request URL**: `https://your-app.onrender.com/webhook/slack/events`
   - **Slash Command URL**: `https://your-app.onrender.com/slack/command`
   - **OAuth Redirect URL**: `https://your-app.onrender.com/slack/oauth_redirect`

## Step 6: Test Deployment

1. Check logs in Render dashboard
2. Visit health check: `https://your-app.onrender.com/health`
3. Test Slack integration in `#mejoras_autonomos`

## Monitoring

- **Logs**: Available in Render dashboard
- **Metrics**: CPU/Memory usage tracked
- **Health**: Automatic health checks every 30s
- **Alerts**: Configure in Render settings

## Scaling

- **Horizontal**: Upgrade to higher tier plans
- **Vertical**: Add more instances
- **Database**: Supabase scales automatically
- **Redis**: Render Redis scales with plan

## Troubleshooting

### Build Fails
- Check build logs in Render
- Verify `package.json` scripts
- Ensure TypeScript compiles locally

### App Won't Start
- Check environment variables
- Verify Supabase connection
- Check Redis URL format

### Slack Not Responding
- Verify webhook URLs in Slack app
- Check bot token is correct
- Ensure app is installed in workspace

### Database Errors
- Verify Supabase URL and keys
- Check if migrations ran successfully
- Ensure RLS policies allow access

## Costs

- **Render Web Service**: $7/month (Starter)
- **Render Redis**: $7/month (Starter)
- **Supabase**: Free tier available
- **Total**: ~$14/month for starter setup

## Security Notes

- Environment variables are encrypted
- Use service role key only server-side
- Redis is private by default
- HTTPS enforced automatically