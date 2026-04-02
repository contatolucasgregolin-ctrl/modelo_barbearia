import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let envFile = '';
try {
  envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
} catch (e) {}

let supabaseUrl = '';
let supabaseAnonKey = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/"/g, '').replace(/'/g, '');
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseAnonKey = line.split('=')[1].trim().replace(/"/g, '').replace(/'/g, '');
});

const API_URL = `${supabaseUrl}/rest/v1/user_roles?select=*&limit=1`;
const HEADERS = {
  'apikey': supabaseAnonKey,
  'Authorization': `Bearer ${supabaseAnonKey}`,
};

async function check() {
  const res = await fetch(API_URL, { headers: HEADERS });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
check();
