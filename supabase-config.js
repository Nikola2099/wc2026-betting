// ============================================================
// Supabase konfiguracija
// Zameni SUPABASE_URL i SUPABASE_ANON_KEY vrednostima iz
// Supabase Dashboard → Settings → API
// ============================================================

const SUPABASE_URL = 'https://thrbpelhcgxckgjtzurn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRocmJwZWxoY2d4Y2tnanR6dXJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NTg0NzcsImV4cCI6MjA5MzUzNDQ3N30.KIlUHjcOwLs7-1w1TZiR2ADxE_en-9n9qX7jsC5yZ8g';

// Admin lozinka (koristi se samo u admin.html)
// Promeni pre deploy-a!
const ADMIN_PASSWORD = 'sp2026admin';

// Prebriši library objekat sa klijentom (izbegava konflikt sa CDN-om)
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
