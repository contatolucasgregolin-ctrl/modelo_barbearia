import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read .env.local or .env
let envFile = '';
try {
  envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
} catch (e) {
  try {
    envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
  } catch (e2) {
    console.error("Could not read .env or .env.local");
    process.exit(1);
  }
}

let supabaseUrl = '';
let supabaseAnonKey = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/"/g, '').replace(/'/g, '');
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseAnonKey = line.split('=')[1].trim().replace(/"/g, '').replace(/'/g, '');
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Superbase URL or Anon Key");
  process.exit(1);
}

const API_URL = `${supabaseUrl}/rest/v1/user_roles`;
const HEADERS = {
  'apikey': supabaseAnonKey,
  'Authorization': `Bearer ${supabaseAnonKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function fixAdmin() {
  const email = 'admin@admin.com.br';
  
  // 1. Check if exists
  const res = await fetch(`${API_URL}?email=eq.${email}&select=*`, {
    headers: HEADERS
  });
  
  const data = await res.json();
  console.log("Existing data:", data);
  
  if (data && data.length > 0) {
    const record = data[0];
    if (record.role !== 'admin') {
      console.log("Role is somewhat not admin. Updating...");
      const patchRes = await fetch(`${API_URL}?email=eq.${email}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({ role: 'admin' })
      });
      console.log("Update response:", await patchRes.json());
    } else {
      console.log("User is already admin!");
    }
  } else {
    console.log("User not found in user_roles. Inserting...");
    const postRes = await fetch(API_URL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ email: email, role: 'admin' })
    });
    console.log("Insert response:", await postRes.json());
  }
}

fixAdmin();
