import { createClient } from '@supabase/supabase-js';

console.log('Supabase import works!');
console.log('createClient:', createClient);

const supabaseUrl = 'https://test.supabase.co';
const supabaseAnonKey = 'test-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Supabase client created:', supabase);

export { supabase };