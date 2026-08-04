-- Seed: profiles (20 rows)
-- Insert dummy auth.users rows to satisfy FK constraint
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('a1000000-0000-0000-0000-000000000001', 'maria.santos@seed.ph',       '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000002', 'juan.delacruz@seed.ph',      '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000003', 'ana.reyes@seed.ph',          '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000004', 'carlos.mendoza@seed.ph',     '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000005', 'rosa.villanueva@seed.ph',    '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000006', 'pedro.bautista@seed.ph',     '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000007', 'liza.fernandez@seed.ph',     '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000008', 'ramon.castillo@seed.ph',     '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000009', 'elena.torres@seed.ph',       '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000010', 'miguel.ramos@seed.ph',       '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000011', 'grace.aquino@seed.ph',       '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000012', 'bernard.lim@seed.ph',        '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000013', 'cynthia.navarro@seed.ph',    '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000014', 'dennis.ocampo@seed.ph',      '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000015', 'felicia.cruz@seed.ph',       '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000016', 'george.pascual@seed.ph',     '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000017', 'helen.soriano@seed.ph',      '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000018', 'ivan.magno@seed.ph',         '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000019', 'jasmine.delatorre@seed.ph',  '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000020', 'kevin.buenaventura@seed.ph', '', now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into profiles (id, full_name, role, barangay, municipality, phone, created_at) values
  ('a1000000-0000-0000-0000-000000000001', 'Maria Santos',       'citizen',   'Brgy. Poblacion',    'Legazpi City',   '09171234501', now() - interval '30 days'),
  ('a1000000-0000-0000-0000-000000000002', 'Juan dela Cruz',     'citizen',   'Brgy. Bigaa',        'Legazpi City',   '09171234502', now() - interval '29 days'),
  ('a1000000-0000-0000-0000-000000000003', 'Ana Reyes',          'citizen',   'Brgy. Padang',       'Legazpi City',   '09171234503', now() - interval '28 days'),
  ('a1000000-0000-0000-0000-000000000004', 'Carlos Mendoza',     'citizen',   'Brgy. Taysan',       'Daraga',         '09171234504', now() - interval '27 days'),
  ('a1000000-0000-0000-0000-000000000005', 'Rosa Villanueva',    'citizen',   'Brgy. Sto. Domingo', 'Daraga',         '09171234505', now() - interval '26 days'),
  ('a1000000-0000-0000-0000-000000000006', 'Pedro Bautista',     'volunteer', 'Brgy. Buyuan',       'Legazpi City',   '09181234506', now() - interval '25 days'),
  ('a1000000-0000-0000-0000-000000000007', 'Liza Fernandez',     'volunteer', 'Brgy. Cabangan',     'Legazpi City',   '09181234507', now() - interval '24 days'),
  ('a1000000-0000-0000-0000-000000000008', 'Ramon Castillo',     'volunteer', 'Brgy. Pawa',         'Daraga',         '09181234508', now() - interval '23 days'),
  ('a1000000-0000-0000-0000-000000000009', 'Elena Torres',       'volunteer', 'Brgy. Lidong',       'Daraga',         '09181234509', now() - interval '22 days'),
  ('a1000000-0000-0000-0000-000000000010', 'Miguel Ramos',       'volunteer', 'Brgy. Mabinit',      'Legazpi City',   '09181234510', now() - interval '21 days'),
  ('a1000000-0000-0000-0000-000000000011', 'Grace Aquino',       'lgu',       'Brgy. Poblacion',    'Legazpi City',   '09191234511', now() - interval '20 days'),
  ('a1000000-0000-0000-0000-000000000012', 'Bernard Lim',        'lgu',       'Brgy. Bigaa',        'Legazpi City',   '09191234512', now() - interval '19 days'),
  ('a1000000-0000-0000-0000-000000000013', 'Cynthia Navarro',    'lgu',       'Brgy. Padang',       'Legazpi City',   '09191234513', now() - interval '18 days'),
  ('a1000000-0000-0000-0000-000000000014', 'Dennis Ocampo',      'ngo',       'Brgy. Taysan',       'Daraga',         '09201234514', now() - interval '17 days'),
  ('a1000000-0000-0000-0000-000000000015', 'Felicia Cruz',       'ngo',       'Brgy. Sto. Domingo', 'Daraga',         '09201234515', now() - interval '16 days'),
  ('a1000000-0000-0000-0000-000000000016', 'George Pascual',     'admin',     'Brgy. Buyuan',       'Legazpi City',   '09201234516', now() - interval '15 days'),
  ('a1000000-0000-0000-0000-000000000017', 'Helen Soriano',      'citizen',   'Brgy. Cabangan',     'Legazpi City',   '09171234517', now() - interval '14 days'),
  ('a1000000-0000-0000-0000-000000000018', 'Ivan Magno',         'citizen',   'Brgy. Pawa',         'Daraga',         '09171234518', now() - interval '13 days'),
  ('a1000000-0000-0000-0000-000000000019', 'Jasmine Dela Torre', 'volunteer', 'Brgy. Lidong',       'Daraga',         '09181234519', now() - interval '12 days'),
  ('a1000000-0000-0000-0000-000000000020', 'Kevin Buenaventura', 'citizen',   'Brgy. Mabinit',      'Legazpi City',   '09171234520', now() - interval '11 days')
on conflict (id) do nothing;
