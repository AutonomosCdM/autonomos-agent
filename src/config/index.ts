import { z } from 'zod';

const configSchema = z.object({
  // Server
  PORT: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Anthropic
  ANTHROPIC_API_KEY: z.string(),
  
  // Supabase
  SUPABASE_URL: z.string(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_KEY: z.string(),
  
  // Twilio
  TWILIO_ACCOUNT_SID: z.string(),
  TWILIO_AUTH_TOKEN: z.string(),
  TWILIO_WHATSAPP_NUMBER: z.string(),
  
  // Slack
  SLACK_CLIENT_ID: z.string(),
  SLACK_CLIENT_SECRET: z.string(),
  SLACK_SIGNING_SECRET: z.string(),
  
  // Redis
  REDIS_URL: z.string(),
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
  },
  redis: {
    url: env.data.REDIS_URL,
  },
};