-- ============================================================
-- CityGirl Wardrobe — give the OWNER write access + an image bucket
-- Owner login: joofonmbuk@gmail.com
-- Run this in Supabase → SQL Editor after schema.sql.
-- ============================================================

-- ---------- 1) Owner can add / edit / delete products, gallery, reviews ----------
-- (The public still only READs, per schema.sql. Writes require the owner's login.)
drop policy if exists "products admin write" on products;
create policy "products admin write" on products for all
  using (auth.jwt() ->> 'email' = 'joofonmbuk@gmail.com')
  with check (auth.jwt() ->> 'email' = 'joofonmbuk@gmail.com');

drop policy if exists "gallery admin write" on gallery;
create policy "gallery admin write" on gallery for all
  using (auth.jwt() ->> 'email' = 'joofonmbuk@gmail.com')
  with check (auth.jwt() ->> 'email' = 'joofonmbuk@gmail.com');

drop policy if exists "reviews admin write" on reviews;
create policy "reviews admin write" on reviews for all
  using (auth.jwt() ->> 'email' = 'joofonmbuk@gmail.com')
  with check (auth.jwt() ->> 'email' = 'joofonmbuk@gmail.com');

-- ---------- 2) Public image bucket for product photos ----------
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = true;

-- Anyone can view the images (they're product photos).
drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects
  for select using (bucket_id = 'products');

-- Only the owner can upload / change / remove images.
drop policy if exists "product images owner insert" on storage.objects;
create policy "product images owner insert" on storage.objects
  for insert with check (bucket_id = 'products' and auth.jwt() ->> 'email' = 'joofonmbuk@gmail.com');

drop policy if exists "product images owner update" on storage.objects;
create policy "product images owner update" on storage.objects
  for update using (bucket_id = 'products' and auth.jwt() ->> 'email' = 'joofonmbuk@gmail.com');

drop policy if exists "product images owner delete" on storage.objects;
create policy "product images owner delete" on storage.objects
  for delete using (bucket_id = 'products' and auth.jwt() ->> 'email' = 'joofonmbuk@gmail.com');

-- ============================================================
-- 3) CREATE THE OWNER LOGIN (do this in the dashboard, not SQL):
--    Authentication → Users → Add user →
--       email:    joofonmbuk@gmail.com
--       password: (choose one)
--       ✅ tick "Auto Confirm User"
--    That email/password is what you'll use on admin.html.
-- ============================================================

-- ---------- 4) Owner can read + update all orders (for the Sales Dashboard) ----------
drop policy if exists "orders admin all" on orders;
create policy "orders admin all" on orders for all
  using (auth.jwt() ->> 'email' = 'joofonmbuk@gmail.com')
  with check (auth.jwt() ->> 'email' = 'joofonmbuk@gmail.com');
