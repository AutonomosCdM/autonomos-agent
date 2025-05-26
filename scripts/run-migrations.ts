import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  console.log('🚀 Running migrations...');
  
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    console.log(`\n📄 Running migration: ${file}`);
    
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    
    try {
      const { error } = await supabase.from('_migrations').select('*').limit(1);
      
      // If _migrations table doesn't exist, create it
      if (error?.code === '42P01') {
        await supabase.rpc('exec_sql', {
          sql: `CREATE TABLE IF NOT EXISTS _migrations (
            id SERIAL PRIMARY KEY,
            filename TEXT UNIQUE NOT NULL,
            executed_at TIMESTAMP DEFAULT NOW()
          )`
        });
      }
      
      // Check if migration already executed
      const { data: existing } = await supabase
        .from('_migrations')
        .select('*')
        .eq('filename', file)
        .single();
        
      if (existing) {
        console.log(`⏭️  Migration already executed: ${file}`);
        continue;
      }
      
      // Execute migration
      const { error: migrationError } = await supabase.rpc('exec_sql', { sql });
      
      if (migrationError) {
        console.error(`❌ Error in migration ${file}:`, migrationError);
        throw migrationError;
      }
      
      // Record migration
      await supabase.from('_migrations').insert({ filename: file });
      
      console.log(`✅ Migration completed: ${file}`);
    } catch (err) {
      console.error(`❌ Failed to run migration ${file}:`, err);
      throw err;
    }
  }
  
  console.log('\n✅ All migrations completed successfully!');
}

runMigrations().catch(console.error);