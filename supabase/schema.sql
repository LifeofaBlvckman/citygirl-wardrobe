-- ============================================================
-- CityGirl Wardrobe — Supabase schema
-- Run this in your Supabase project: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run once on a fresh project.
-- ============================================================

-- ---------- PRODUCTS ----------
create table if not exists products (
  id          text primary key,            -- e.g. 'd1'
  name        text not null,
  price       integer not null default 0,  -- price in Naira (whole number)
  category    text,                         -- 'Dresses','Sets','Tops','Bottoms','Accessories'
  tag         text default '',              -- 'New','Bestseller','Sold Out' or ''
  bestseller  boolean default false,
  image       text,                         -- main photo URL
  images      jsonb default '[]'::jsonb,    -- gallery URLs
  sizes       jsonb default '["S","M","L","XL"]'::jsonb,
  fabric      text,
  stretch     text,
  care        text,
  fit         text,
  model_size  text,
  model_info  text,
  rating      numeric default 0,
  reviews     integer default 0,
  description text,
  sort        integer default 0,
  created_at  timestamptz default now()
);

-- ---------- ORDERS ----------
create table if not exists orders (
  id          uuid primary key default gen_random_uuid(),
  ref         text unique not null,         -- e.g. 'CGW-8F3K2A'
  user_id     uuid references auth.users(id) on delete set null, -- null for guest checkout
  customer    jsonb not null,               -- { name, email, phone, address, country, ... }
  items       jsonb not null,               -- [ { id, name, size, qty, price } ]
  subtotal    integer not null default 0,
  shipping    integer not null default 0,
  total       integer not null default 0,
  status      text not null default 'pending', -- pending | paid | shipped | cancelled
  paystack_ref text,
  created_at  timestamptz default now()
);

-- ---------- CUSTOMER PROFILES (extra info linked to the auth user) ----------
-- Passwords are NEVER stored here — Supabase Auth handles them (hashed with bcrypt).
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  created_at  timestamptz default now()
);

-- ---------- NEWSLETTER SUBSCRIBERS ----------
create table if not exists subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  created_at  timestamptz default now()
);

-- ---------- REVIEWS ----------
create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,       -- '@amaka.o'
  rating      integer default 5,
  text        text not null,
  product     text,
  approved    boolean default true,
  created_at  timestamptz default now()
);

-- ---------- GALLERY (the "Follow the CityGirl Life" strip) ----------
create table if not exists gallery (
  id          uuid primary key default gen_random_uuid(),
  url         text not null,
  sort        integer default 0,
  created_at  timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- The public site uses the ANON key. We allow the public to READ the shop,
-- INSERT orders/subscribers, and READ approved reviews/gallery — nothing else.
-- All editing (adding products, changing orders) is done from the Supabase
-- dashboard or a trusted server using the SERVICE ROLE key, which bypasses RLS.
-- ============================================================
alter table products    enable row level security;
alter table orders      enable row level security;
alter table profiles    enable row level security;
alter table subscribers enable row level security;
alter table reviews     enable row level security;
alter table gallery     enable row level security;

-- Products: anyone can read; nobody can write with the anon key.
create policy "products read"     on products    for select using (true);

-- Reviews: anyone can read approved reviews.
create policy "reviews read"      on reviews     for select using (approved = true);

-- Gallery: anyone can read.
create policy "gallery read"      on gallery     for select using (true);

-- Orders: anyone can create an order (guest checkout). Logged-in users can read their own.
create policy "orders insert"     on orders      for insert with check (true);
create policy "orders read own"   on orders      for select using (auth.uid() = user_id);

-- Subscribers: anyone can subscribe.
create policy "subscribers insert" on subscribers for insert with check (true);

-- Profiles: a logged-in user can read/update only their own profile.
create policy "profile read own"   on profiles    for select using (auth.uid() = id);
create policy "profile upsert own" on profiles    for insert with check (auth.uid() = id);
create policy "profile update own" on profiles    for update using (auth.uid() = id);

-- ============================================================
-- OPTIONAL: auto-create a profile row when a customer signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone');
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
