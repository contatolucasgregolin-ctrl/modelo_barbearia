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

const API_URL = `${supabaseUrl}/rest/v1/rpc/get_columns?table_name=user_roles`;
// Actually I don't have this RPC. I'll use raw SQL if possible, but I can't.
// I'll try to use a hacky FETCH with limit 0 on user_roles and check headers or just error message columns.

const CHECK_URL = `${supabaseUrl}/rest/v1/user_roles?select=*&limit=1`;
const HEADERS = {
  'apikey': supabaseAnonKey,
  'Authorization': `Bearer ${supabaseAnonKey}`,
};

async function check() {
  const res = await fetch(CHECK_URL, { headers: HEADERS });
  const data = await res.json();
  if (data && data.length > 0) {
    console.log("Found row! Columns:", Object.keys(data[0]));
  } else {
    console.log("No rows found. Returning error or empty data:", data);
  }
}
check();
