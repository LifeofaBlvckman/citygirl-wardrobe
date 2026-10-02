-- ============================================================
-- CityGirl Wardrobe — let customers check their order status (run once)
-- Supabase Dashboard → SQL Editor → New query → paste → Run.
--
-- Shoppers can't read the orders table directly (that keeps everyone's
-- orders private). This function returns ONLY the status of ONE order, and
-- only when both the order number and the email used at checkout match.
-- The "My Orders" page uses it to show "Order placed / Paid / On its way".
-- ============================================================

create or replace function public.order_status(p_ref text, p_email text)
returns table (status text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select o.status, o.created_at
  from orders o
  where o.ref = upper(trim(p_ref))
    and lower(o.customer->>'email') = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.order_status(text, text) from public;
grant execute on function public.order_status(text, text) to anon, authenticated;
