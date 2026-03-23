import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Le mot "export" est obligatoire ici !
export const supabase = createClient(supabaseUrl, supabaseAnonKey)