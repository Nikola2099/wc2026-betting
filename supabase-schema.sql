-- ============================================================
-- SP 2026 Klađenje - Supabase Schema
-- Pokrenuti u Supabase SQL Editor
-- ============================================================

-- 1. MATCHES
create table if not exists matches (
  id int primary key,
  date date not null,
  home_team text not null,
  away_team text not null,
  group_name text not null,
  result text check (result in ('1', 'X', '2'))
);

-- 2. PARTICIPANTS
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- 3. TIPS
create table if not exists tips (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  match_id int not null references matches(id),
  tip_type text not null check (tip_type in ('single', 'double', 'triple')),
  tip_value text not null check (tip_value in ('1', 'X', '2', '1X', 'X2', '12', '1X2')),
  unique(participant_id, match_id)
);

-- 4. SETTINGS
create table if not exists settings (
  key text primary key,
  value text not null
);

insert into settings (key, value) values
  ('deadline', '2026-06-10T23:59:59+02:00'),
  ('submissions_open', 'true')
on conflict (key) do nothing;

-- ============================================================
-- RLS POLICIES
-- ============================================================

alter table matches enable row level security;
alter table participants enable row level security;
alter table tips enable row level security;
alter table settings enable row level security;

-- Matches: svi mogu da čitaju
drop policy if exists "matches_select" on matches;
create policy "matches_select" on matches for select using (true);

-- Settings: svi mogu da čitaju
drop policy if exists "settings_select" on settings;
create policy "settings_select" on settings for select using (true);

-- Participants: insert uvek, select samo admin (service role)
drop policy if exists "participants_insert" on participants;
drop policy if exists "participants_select" on participants;
create policy "participants_insert" on participants for insert with check (true);
create policy "participants_select" on participants for select using (true);

-- Tips: insert uvek (dok je rok otvoren - validacija na frontendu)
--       select: svi mogu da čitaju posle roka (submissions_open = false)
drop policy if exists "tips_insert" on tips;
drop policy if exists "tips_select" on tips;
create policy "tips_insert" on tips for insert with check (true);
create policy "tips_select" on tips for select using (true);

-- ============================================================
-- SEED: 72 UTAKMICE GRUPNE FAZE SP 2026
-- ============================================================

-- Ako već imaš podatke, prvo pokreni: TRUNCATE matches CASCADE;
insert into matches (id, date, home_team, away_team, group_name) values
  -- KOLO 1
  ( 1, '2026-06-11', 'Meksiko',             'Južna Afrika',        'A'),
  ( 2, '2026-06-11', 'Južna Koreja',        'Češka',               'A'),
  ( 3, '2026-06-12', 'Kanada',              'Bosna i Hercegovina', 'B'),
  ( 4, '2026-06-13', 'Katar',               'Švajcarska',          'B'),
  ( 5, '2026-06-13', 'Brazil',              'Maroko',              'C'),
  ( 6, '2026-06-13', 'Haiti',               'Škotska',             'C'),
  ( 7, '2026-06-12', 'SAD',                 'Paragvaj',            'D'),
  ( 8, '2026-06-13', 'Australija',          'Turska',              'D'),
  ( 9, '2026-06-14', 'Nemačka',             'Kirasao',             'E'),
  (10, '2026-06-14', 'Obala Slonovače',     'Ekvador',             'E'),
  (11, '2026-06-14', 'Holandija',           'Japan',               'F'),
  (12, '2026-06-14', 'Švedska',             'Tunis',               'F'),
  (13, '2026-06-15', 'Belgija',             'Egipat',              'G'),
  (14, '2026-06-15', 'Iran',                'Novi Zeland',         'G'),
  (15, '2026-06-15', 'Španija',             'Zelenortska Ostrva',  'H'),
  (16, '2026-06-15', 'Saudijska Arabija',   'Urugvaj',             'H'),
  (17, '2026-06-16', 'Francuska',           'Senegal',             'I'),
  (18, '2026-06-16', 'Irak',                'Norveška',            'I'),
  (19, '2026-06-16', 'Argentina',           'Alžir',               'J'),
  (20, '2026-06-16', 'Austrija',            'Jordan',              'J'),
  (21, '2026-06-17', 'Portugal',            'DR Kongo',            'K'),
  (22, '2026-06-17', 'Uzbekistan',          'Kolumbija',           'K'),
  (23, '2026-06-17', 'Engleska',            'Hrvatska',            'L'),
  (24, '2026-06-17', 'Gana',                'Panama',              'L'),
  -- KOLO 2
  (25, '2026-06-18', 'Češka',               'Južna Afrika',        'A'),
  (26, '2026-06-18', 'Meksiko',             'Južna Koreja',        'A'),
  (27, '2026-06-18', 'Švajcarska',          'Bosna i Hercegovina', 'B'),
  (28, '2026-06-18', 'Kanada',              'Katar',               'B'),
  (29, '2026-06-19', 'Škotska',             'Maroko',              'C'),
  (30, '2026-06-19', 'Brazil',              'Haiti',               'C'),
  (31, '2026-06-19', 'Turska',              'Paragvaj',            'D'),
  (32, '2026-06-19', 'SAD',                 'Australija',          'D'),
  (33, '2026-06-20', 'Ekvador',             'Kirasao',             'E'),
  (34, '2026-06-20', 'Nemačka',             'Obala Slonovače',     'E'),
  (35, '2026-06-20', 'Tunis',               'Japan',               'F'),
  (36, '2026-06-20', 'Holandija',           'Švedska',             'F'),
  (37, '2026-06-21', 'Novi Zeland',         'Egipat',              'G'),
  (38, '2026-06-21', 'Belgija',             'Iran',                'G'),
  (39, '2026-06-21', 'Urugvaj',             'Zelenortska Ostrva',  'H'),
  (40, '2026-06-21', 'Španija',             'Saudijska Arabija',   'H'),
  (41, '2026-06-22', 'Norveška',            'Senegal',             'I'),
  (42, '2026-06-22', 'Francuska',           'Irak',                'I'),
  (43, '2026-06-22', 'Jordan',              'Alžir',               'J'),
  (44, '2026-06-22', 'Argentina',           'Austrija',            'J'),
  (45, '2026-06-23', 'Kolumbija',           'DR Kongo',            'K'),
  (46, '2026-06-23', 'Portugal',            'Uzbekistan',          'K'),
  (47, '2026-06-23', 'Panama',              'Hrvatska',            'L'),
  (48, '2026-06-23', 'Engleska',            'Gana',                'L'),
  -- KOLO 3
  (49, '2026-06-24', 'Južna Afrika',        'Južna Koreja',        'A'),
  (50, '2026-06-24', 'Češka',               'Meksiko',             'A'),
  (51, '2026-06-24', 'Bosna i Hercegovina', 'Katar',               'B'),
  (52, '2026-06-24', 'Švajcarska',          'Kanada',              'B'),
  (53, '2026-06-24', 'Maroko',              'Haiti',               'C'),
  (54, '2026-06-24', 'Škotska',             'Brazil',              'C'),
  (55, '2026-06-25', 'Paragvaj',            'Australija',          'D'),
  (56, '2026-06-25', 'Turska',              'SAD',                 'D'),
  (57, '2026-06-25', 'Kirasao',             'Obala Slonovače',     'E'),
  (58, '2026-06-25', 'Ekvador',             'Nemačka',             'E'),
  (59, '2026-06-25', 'Japan',               'Švedska',             'F'),
  (60, '2026-06-25', 'Tunis',               'Holandija',           'F'),
  (61, '2026-06-26', 'Egipat',              'Iran',                'G'),
  (62, '2026-06-26', 'Novi Zeland',         'Belgija',             'G'),
  (63, '2026-06-26', 'Zelenortska Ostrva',  'Saudijska Arabija',   'H'),
  (64, '2026-06-26', 'Urugvaj',             'Španija',             'H'),
  (65, '2026-06-26', 'Senegal',             'Irak',                'I'),
  (66, '2026-06-26', 'Norveška',            'Francuska',           'I'),
  (67, '2026-06-27', 'Alžir',               'Austrija',            'J'),
  (68, '2026-06-27', 'Jordan',              'Argentina',           'J'),
  (69, '2026-06-27', 'DR Kongo',            'Uzbekistan',          'K'),
  (70, '2026-06-27', 'Kolumbija',           'Portugal',            'K'),
  (71, '2026-06-27', 'Hrvatska',            'Gana',                'L'),
  (72, '2026-06-27', 'Panama',              'Engleska',            'L')
on conflict (id) do nothing;
