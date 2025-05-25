#!/usr/bin/env ts-node

import { OpenRouterService } from '../src/services/ai/openrouter';
import type { Message } from '../src/types/database';

async function testOpenRouter() {
  console.log('🚀 Testing OpenRouter integration...\n');
  
  const apiKey = process.env.OPENROUTER_API_KEY || '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';
  
  if (!apiKey || apiKey === 'placeholder') {
    console.error('❌ OPENROUTER_API_KEY not set');
    process.exit(1);
  }
  
  const openRouter = new OpenRouterService(apiKey);
  
  try {
    // Test 1: Validate API key
    console.log('🔑 Test 1: Validating API key...');
    const isValid = await openRouter.validateApiKey();
    
    if (!isValid) {
      console.error('❌ Invalid OpenRouter API key');
      process.exit(1);
    }
    
    console.log('✅ API key is valid');
    
    // Test 2: Get available models
    console.log('\n📋 Test 2: Fetching available models...');
    const models = await openRouter.getModels();
    
    console.log(`✅ Found ${models.length} models`);
    
    // Show some popular models
    const popularModels = models.filter(m => 
      m.id.includes('claude') || 
      m.id.includes('gpt-4') || 
      m.id.includes('llama')
    ).slice(0, 5);
    
    if (popularModels.length > 0) {
      console.log('\nPopular models available:');
      popularModels.forEach(model => {
        console.log(`  - ${model.id} (${model.name})`);
      });
    }
    
    // Test 3: Generate a simple response
    console.log('\n💬 Test 3: Generating AI response...');
    
    const testMessages: Message[] = [
      {
        id: '1',
        organization_id: 'test',
        conversation_id: 'test',
        role: 'user',
        content: 'Hola! ¿Puedes ayudarme con una pregunta de prueba?',
        metadata: {},
        created_at: new Date().toISOString()
      }
    ];
    
    const systemPrompt = 'You are Autonomos, a helpful AI assistant. Respond in Spanish and be friendly and concise.';
    
    const response = await openRouter.generateResponse(
      testMessages,
      systemPrompt,
      {
        model: 'anthropic/claude-3.5-sonnet',
        maxTokens: 200,
        temperature: 0.7
      }
    );
    
    console.log('✅ Response generated:');
    console.log(`"${response}"`);
    
    // Test 4: Test streaming (optional)
    console.log('\n🔄 Test 4: Testing streaming response...');
    
    const streamMessages: Message[] = [
      {
        id: '2',
        organization_id: 'test',
        conversation_id: 'test',
        role: 'user',
        content: '¿Puedes contarme sobre Autonomos en pocas palabras?',
        metadata: {},
        created_at: new Date().toISOString()
      }
    ];
    
    let streamedContent = '';
    const streamResponse = await openRouter.streamResponse(
      streamMessages,
      systemPrompt,
      {
        model: 'anthropic/claude-3.5-sonnet',
        maxTokens: 150,
        temperature: 0.7
      },
      (chunk) => {
        process.stdout.write(chunk);
        streamedContent += chunk;
      }
    );
    
    console.log('\n✅ Streaming response completed');
    console.log(`Full response: "${streamResponse}"`);
    
    console.log('\n🎉 All OpenRouter tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testOpenRouter().catch(console.error);
}