// backend/src/config/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Inicialización del cliente reinnillo
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false // Importante en backend: no guardar sesión en memoria/localstorage
  }
});

console.log('⚡ Cliente Supabase SDK inicializado.');

export default supabase;