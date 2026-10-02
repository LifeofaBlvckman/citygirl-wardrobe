# Connecting CityGirl Wardrobe to Supabase

Right now the site keeps everything (products, orders, subscribers) in the visitor's
browser (`localStorage`), so data isn't shared between devices and disappears if the
browser is cleared. Supabase gives you a real database + logins + file storage, all
on a generous free tier. This guide gets you there.

Two files are already in this project to help you:
- `supabase/schema.sql` — creates every table with the right security rules.
- `assets/js/supabase-config.example.js` — the code that talks to Supabase.

---

## Step 1 — Create the project
1. Go to **supabase.com** → sign in → **New project**.
2. Name it `citygirl`, choose a region close to Nigeria (e.g. **West EU / London**), set a
   strong database password (save it), and create. Give it ~2 minutes to finish.

## Step 2 — Create the tables
1. In the project, open **SQL Editor → New query**.
2. Open `supabase/schema.sql` from this project, copy **everything**, paste it in, click **Run**.
3. Open **Table Editor** — you should now see `products`, `orders`, `profiles`,
   `subscribers`, `reviews`, `gallery`.

## Step 3 — Get your keys
1. Go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
   - The **anon** key is safe to put in the website — the security rules in the schema
     control what it can do.
   - The **service_role** key is a master key. **Never** put it in the website or share it.
     Only use it in the Supabase dashboard or a private server.

## Step 4 — Add Supabase to the site
1. Rename `assets/js/supabase-config.example.js` → **`assets/js/supabase-config.js`**.
2. Paste your Project URL and anon key at the top of that file.
3. In each HTML page (`index.html`, `shop.html`, `checkout.html`, …), add these **two lines
   inside `<head>`, before `store-data.js`**:

   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="assets/js/supabase-config.js"></script>
   ```

## Step 5 — Move your data into Supabase
- **Products:** in **Table Editor → products → Insert**, add each gown (or import a CSV).
  Use the same fields you see in `assets/js/store-data.js` (id, name, price, category,
  image, sizes, fabric, etc.). Tip: upload the dress photos in **Storage** (next step) and
  paste their URLs into `image` / `images`.
- **Reviews & gallery:** add rows the same way whenever you want to feature new ones.

## Step 6 — Store the dress photos (Storage)
1. Open **Storage → New bucket**, name it `products`, make it **Public**.
2. Upload your photos. Each file gets a public URL (**Copy URL**) you paste into the
   product's `image`/`images` fields. This replaces the placeholder images.

## Step 7 — Customer accounts & passwords (important)
- Go to **Authentication → Providers → Email** and enable it.
- Customers sign up with the `cgwSignUp()` function — **Supabase stores and hashes their
  passwords for you (bcrypt).** You should **never** store raw passwords in your own tables,
  and you never need to. The `profiles` table only holds name/phone, linked to the login.
- For a shop you can also keep **guest checkout** (no account needed) — orders still save,
  just with no `user_id`.

## Step 8 — Wire the code
Open `assets/js/supabase-config.js` and read the **"HOW TO PLUG THIS INTO THE EXISTING
SITE"** section at the bottom. It shows the exact 3–4 spots to change:
- load products from the DB instead of the sample list,
- save each checkout order to `orders`,
- send newsletter emails to `subscribers`,
- (optionally) load reviews/gallery from the DB.

When you're ready to do that wiring, send me the word and I'll edit the pages for you —
I just need your Project URL + anon key in place (or you can paste them and I'll finish it).

---

## Where money fits in
Your checkout already has a Paystack hook (`PAYSTACK_PUBLIC_KEY` in `checkout.html`). The
clean flow is: customer pays with Paystack → on success you save the order to Supabase with
`status: 'paid'` and the Paystack reference. For extra safety later, verify the payment on a
small server function before marking it paid — but client-side is fine to launch.

## Free-tier limits (plenty to start)
Supabase free tier: 500 MB database, 1 GB file storage, 50,000 monthly active users. More
than enough for launch; upgrade only when you grow.

---

## Product Manager (owner adds products + photos for everyone)

`admin.html` is a login-protected page where the owner adds/edits/deletes
products and uploads photos **straight to the database + Storage**, so every visitor
sees them (not just the admin's device).

**One-time setup:**
1. Run `supabase/admin-access.sql` in the SQL Editor (gives the owner write access and
   creates the public `products` image bucket).
2. Create the owner login: **Authentication → Users → Add user** →
   email `joofonmbuk@gmail.com`, choose a password, tick **Auto Confirm User**.

**Daily use:** open `yoursite.com/admin.html`, log in with that email/password,
click **+ Add product**, fill the details, **Upload photo**, **Save**. It's live for
everyone immediately. (The old Products tab in `admin.html` only affects your own browser
— the Product Manager is the one that everyone sees.)
