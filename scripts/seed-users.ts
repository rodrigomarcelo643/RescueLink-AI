import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://bgcstqafexuhhtfmjvnp.supabase.co',
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

const users = [
  { email: 'admin@rescuelinkai.ph',     password: 'Admin1234!',     role: 'admin',     full_name: 'Admin User' },
  { email: 'lgu@rescuelinkai.ph',       password: 'Lgu12345!',      role: 'lgu',       full_name: 'LGU Officer' },
  { email: 'volunteer@rescuelinkai.ph', password: 'Volunteer1234!', role: 'volunteer', full_name: 'Test Volunteer' },
  { email: 'citizen@rescuelinkai.ph',   password: 'Citizen1234!',   role: 'citizen',   full_name: 'Test Citizen' },
]

for (const u of users) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { full_name: u.full_name },
  })

  if (error) { console.error(`❌ ${u.email}:`, error.message); continue }

  await supabase.from('profiles').update({ role: u.role }).eq('id', data.user.id)
  console.log(`✅ ${u.email} (${u.role})`)
}
