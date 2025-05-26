import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const configSchema = z.object({
  // Server
  PORT: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // AI APIs
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().default('placeholder'),
  
  // Supabase
  SUPABASE_URL: z.string().default('http://localhost:54321'),
  SUPABASE_ANON_KEY: z.string().default('placeholder'),
  SUPABASE_SERVICE_KEY: z.string().default('placeholder'),
  
  // Twilio
  TWILIO_ACCOUNT_SID: z.string().default('placeholder'),
  TWILIO_AUTH_TOKEN: z.string().default('placeholder'),
  TWILIO_WHATSAPP_NUMBER: z.string().default('placeholder'),
  
  // Slack
  SLACK_CLIENT_ID: z.string().default('placeholder'),
  SLACK_CLIENT_SECRET: z.string().default('placeholder'),
  SLACK_SIGNING_SECRET: z.string().default('placeholder'),
  SLACK_BOT_TOKEN: z.string().default('placeholder'),
  
  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_TLS_URL: z.string().optional(), // Render provides this
  DISABLE_REDIS: z.string().optional(), // Temporary flag to disable Redis
});

export type Config = z.infer<typeof configSchema>;

const env = configSchema.safeParse(process.env);

if (!env.success) {
  console.error('❌ Invalid environment variables:', env.error.format());
  process.exit(1);
}

export const config = {
  port: parseInt(env.data.PORT || '3000', 10),
  nodeEnv: env.data.NODE_ENV,
  anthropic: {
    apiKey: env.data.ANTHROPIC_API_KEY,
  },
  openrouter: {
    apiKey: env.data.OPENROUTER_API_KEY,
  },
  supabase: {
    url: env.data.SUPABASE_URL,
    anonKey: env.data.SUPABASE_ANON_KEY,
    serviceRoleKey: env.data.SUPABASE_SERVICE_KEY,
  },
  twilio: {
    accountSid: env.data.TWILIO_ACCOUNT_SID,
    authToken: env.data.TWILIO_AUTH_TOKEN,
    whatsappNumber: env.data.TWILIO_WHATSAPP_NUMBER,
  },
  slack: {
    clientId: env.data.SLACK_CLIENT_ID,
    clientSecret: env.data.SLACK_CLIENT_SECRET,
    signingSecret: env.data.SLACK_SIGNING_SECRET,
    botToken: env.data.SLACK_BOT_TOKEN,
  },
  redis: {
    url: env.data.REDIS_TLS_URL || env.data.REDIS_URL,
    enabled: !env.data.DISABLE_REDIS && env.data.NODE_ENV === 'production' && (env.data.REDIS_TLS_URL || env.data.REDIS_URL !== 'redis://localhost:6379'),
  },
};