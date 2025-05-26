import dotenv from 'dotenv';
dotenv.config();

import { supabaseAdmin } from '../src/lib/supabase';
import { OpenRouterService } from '../src/services/ai/openrouter';
import { OrganizationService, ChannelService } from '../src/services/database';

async function testDirectly() {
  console.log('🧪 Testing direct connection...\n');

  try {
    // 1. Test Supabase connection
    console.log('1️⃣ Testing Supabase...');
    const orgs = await OrganizationService.getBySlug('test-company');
    console.log('✅ Found organization:', orgs?.name);

    // 2. Test channels
    console.log('\n2️⃣ Testing channels...');
    const channels = await ChannelService.getByOrganization(orgs!.id);
    console.log(`✅ Found ${channels.length} channels`);
    channels.forEach(ch => {
      console.log(`  - ${ch.type}: ${ch.name}`);
    });

    // 3. Test OpenRouter AI
    console.log('\n3️⃣ Testing OpenRouter AI...');
    const ai = new OpenRouterService(process.env.OPENROUTER_API_KEY!);
    const response = await ai.generateResponse(
      [
        { role: 'user', content: 'Say "Hello, I am working!" in Spanish.' }
      ],
      'You are a helpful assistant.',
      {
        model: 'anthropic/claude-3-haiku',
        temperature: 0.7,
        max_tokens: 100
      }
    );
    console.log('✅ AI Response:', response);

    console.log('\n✨ All systems operational!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testDirectly();