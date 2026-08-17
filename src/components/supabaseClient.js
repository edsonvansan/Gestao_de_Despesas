import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bdfkysdolcgvwbixskpg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZmt5c2RvbGNndndiaXhza3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MzkzNjQsImV4cCI6MjEwMjExNTM2NH0.Lx_E6QH1tCPNyTtSLm8iVZ_bmrw5vp88_8Mn151Dy9Q'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})