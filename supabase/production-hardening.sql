-- ============================================================
-- CityGirl Wardrobe — production hardening (run once)
-- Supabase Dashboard → SQL Editor → New query → paste → Run.
--
-- Shoppers place orders with the public (anon) key. Without this, a shopper
-- could create an order that already says "paid". After this, orders from the
-- website can only start as "pending"; only the server (api/paystack-verify.js,
-- using the service role key) or you in Admin can mark them paid.
-- ============================================================

drop policy if exists "orders insert" on orders;
create policy "orders insert" on orders
  for insert
  with check (
    status = 'pending'
    and total >= 0
    and jsonb_typeof(items) = 'array'
    and jsonb_array_length(items) between 1 and 50
  );

-- Newsletter: one row per email, stored lower-case.
drop policy if exists "subscribers insert" on subscribers;
create policy "subscribers insert" on subscribers
  for insert
  with check (email = lower(email) and length(email) between 5 and 254 and position('@' in email) > 1);
