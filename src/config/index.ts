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

export const config = configSchema.parse(process.env);