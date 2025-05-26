# Autonomos Agent

🤖 Multi-tenant AI communication agent powered by OpenRouter with WhatsApp and Slack integration.

## Features

- **Multi-AI Models**: Access 320+ models via OpenRouter (Claude, GPT-4, Llama, etc.)
- **WhatsApp Integration**: Via Twilio for business messaging
- **Slack Integration**: Real-time monitoring and responses
- **Multi-tenant**: Isolated data per organization
- **Queue System**: Async processing with BullMQ + Redis
- **Production Ready**: Docker, health checks, monitoring

## Tech Stack

- **Backend**: Node.js + TypeScript + Express
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **AI**: OpenRouter API for multi-model access
- **Queue**: BullMQ + Redis
- **Deployment**: Render (Docker)
- **Monitoring**: Winston logging + health checks

## Quick Start (Local)

```bash
# Clone and install
git clone https://github.com/AutonomosCdM/autonomos-agent
cd autonomos-agent
npm install

# Setup environment
cp .env.example .env
# Add your API keys to .env

# Start services
docker-compose up -d redis
supabase start

# Run application
npm run dev
```

## Deployment

### Production (Render)
See [docs/RENDER_DEPLOYMENT.md](docs/RENDER_DEPLOYMENT.md) for complete deployment guide.

**Quick Deploy Checklist:**
- See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for step-by-step deployment verification

### Local Development
See [docs/SLACK_SETUP.md](docs/SLACK_SETUP.md) for Slack integration setup.

## Environment Variables

Required:
- `OPENROUTER_API_KEY` - OpenRouter API key for AI models
- `SLACK_BOT_TOKEN` - Slack bot token
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `REDIS_URL` - Redis connection URL

Optional:
- `TWILIO_*` - For WhatsApp integration
- `ANTHROPIC_API_KEY` - Direct Claude API (fallback)

## API Endpoints

- `GET /health` - Health check
- `POST /webhook/whatsapp/:orgSlug` - WhatsApp webhook
- `POST /webhook/slack/events` - Slack events

## Architecture

```
User Message → Slack/WhatsApp → Webhook → Queue → AI Processing → Response
                                               ↓
Database (Multi-tenant) ← → OpenRouter API (Claude/GPT-4/etc.)
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Submit pull request

## License

MIT License - see LICENSE file for details.