import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });
dotenv.config({ path: resolve(__dirname, '.env.local') }); // Also load .env.local if exists

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Superbase URL or Anon Key. Please make sure .env contains them.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixAdmin() {
  const email = 'admin@admin.com.br';
  console.log(`Checking role for ${email}...`);

  // First, check if there's an existing record
  const { data: existing, error: fetchErr } = await supabase
    .from('user_roles')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (fetchErr) {
    console.error("Error fetching:", fetchErr);
    return;
  }

  if (existing) {
    console.log("Found existing record:", existing);
    if (existing.role !== 'admin') {
       console.log("Updating role to admin...");
       const { error: upErr } = await supabase
         .from('user_roles')
         .update({ role: 'admin' })
         .eq('email', email);
       if (upErr) console.error("Error updating:", upErr);
       else console.log("Successfully updated to admin.");
    } else {
       console.log("User is already admin in DB. Trying to find user_id issue...");
         // Maybe the user_id isn't linked? But AuthContext.jsx links it if missing.
    }
  } else {
    console.log("No record found. Inserting new admin record for", email);
    const { error: insErr } = await supabase
      .from('user_roles')
      .insert([{ email: email, role: 'admin' }]);
    
    if (insErr) {
      console.error("Error inserting:", insErr);
    } else {
      console.log("Successfully inserted admin role.");
    }
  }
}

fixAdmin();
