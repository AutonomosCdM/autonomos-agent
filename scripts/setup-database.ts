import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

async function setupDatabase() {
  console.log('🚀 Setting up database...');
  
  try {
    // Test connection
    const { data, error } = await supabase.from('organizations').select('count').limit(1);
    
    if (error) {
      console.log('📋 Tables not found, running migrations...');
      
      // Run migrations via Supabase Dashboard
      console.log('\n⚠️  Please run the following migrations in Supabase SQL Editor:');
      console.log('1. Go to: https://supabase.com/dashboard/project/drhatkonaoogphskkmuq/sql');
      console.log('2. Run each migration file from supabase/migrations/ folder');
      console.log('3. Then run: npm run setup-data');
      
      return;
    }
    
    console.log('✅ Database is ready!');
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

setupDatabase();