# CityGirl Wardrobe

A monochrome, editorial storefront for **CityGirl Wardrobe**, with a built-in
admin dashboard the owner can use to edit the site without touching code.

Static HTML/CSS/JS — no build step or dependencies required. The whole UI is
black & white by design; the only colour on the site is the red hero photograph.

## Pages

- `index.html` — Home (full-bleed hero, animated see-through headline, brand marquee)
- `shop.html` — Full catalog, filterable by category
- `checkout.html` — **Real multi-step checkout** (details → review → pay)
- `about.html` — About Us
- `contact.html` — Contact (WhatsApp, Instagram, email, contact form)
- `admin.html` — Store admin dashboard (see below)

## Preview locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser.

## The admin dashboard

Open `admin.html` and log in with the passcode **`citygirl123`** — change it
under Store Settings once you're in. From there you can edit the store details,
colour theme (four **monochrome** presets), homepage hero, newsletter popup,
products (including **uploading product photos** from your device or pasting image URLs), the About story and view/export newsletter subscribers.

**How this works, and its one real limitation:** there's no backend here, so
admin.html and the storefront pages share one JSON blob in this browser's
`localStorage`. Saving in Admin updates that blob instantly for every storefront
page opened *in that same browser* — it does not push changes to every visitor
on its own. To make it live and multi-device, swap `getContent()`/`saveContent()`
in `assets/js/store-data.js` for calls to a real backend; nothing else needs to
change, since every page reads content through those two functions.

## Checkout, payments & orders

`checkout.html` reads the bag, re-prices it from the live product list, collects contact and delivery details (with validation), and places the order.

- **Orders go straight to Supabase.** If an order can't be saved (for example, the customer's connection drops), the customer is told and given a one-tap "Send order on WhatsApp" button. Their bag is kept, so no order is ever lost silently.
- **Payment today:** *Pay on delivery* (Nigeria) or *Pay by bank transfer* (outside Nigeria). *Pay online* shows as "Coming soon" until Paystack is switched on.
- **Delivery fees** live in one file, `assets/js/delivery-rates.js`. The checkout and the payment server both read it.
- **Test mode:** open `checkout.html?test=1` to click through a simulated online payment. Nothing is charged and nothing is saved.

### Turning on Paystack (when you're ready)

1. In Paystack, copy your **public** key (`pk_live_…`) into `paystackPublicKey` in `assets/js/site-config.js`.
2. In Vercel, go to Project → Settings → Environment Variables and add:
   - `PAYSTACK_SECRET_KEY`: your **secret** key (`sk_live_…`). Never put this in any file.
   - `SUPABASE_URL`: `https://zrhfvphtqpsfihnjwtim.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: from Supabase → Project Settings → API. Server only; never put it in any file.
3. In Paystack, go to Settings → API Keys & Webhooks and set the webhook URL to `https://<your-domain>/api/paystack-webhook`.
4. Redeploy, then place a small real order to check it arrives in Admin as **paid**.

How it stays safe:
- The browser never marks an order paid. After Paystack's popup succeeds, `api/paystack-verify.js` asks Paystack whether the payment really went through.
- The server then re-prices the order from your Supabase prices and saves it as **paid**.
- If the amount doesn't match, the order is saved as **pending** with a note for you to check before shipping.
- `api/paystack-webhook.js` does the same check, as a backup for customers who close the page right after paying.
- The tests in `tests/` cover all of this. Run them with `node --test tests/*.test.js`.

## Assets

- `assets/img/logo.png` — the brand logo (used in nav, footer, popups, favicon)
- `assets/img/hero-red-dress*.jpg` — the homepage hero (the site's only colour)
- Product and About images are still stock placeholders (grayscale on the site,
  colour on hover). Replace them with real photos via Admin (image **URLs**).

## Before going live

- **Run `supabase/production-hardening.sql` once** in Supabase → SQL Editor. It stops anyone outside the store from creating an order that already says "paid".
- **Custom domain:** if you move off `citygirlwardrobe-bw-3.vercel.app`, find and replace that address in every `.html` file, `robots.txt`, `sitemap.xml` and `assets/js/site-config.js`.
- **Google:** add the site in Google Search Console and submit `https://<your-domain>/sitemap.xml`.
- Replace the WhatsApp number, Instagram handle and email in Admin with the real ones, if you haven't already.
- `admin.html` and `checkout.html` are hidden from search engines (`noindex` and `robots.txt`).

## Update — Conversion upgrade (v3.1)

**Homepage**
- **Video hero** (`assets/img/hero-citygirl.mp4`, auto-plays muted & looped, poster fallback) with the new headline **CITY GIRL ENERGY. / DRESSED TO MATCH.** and two CTAs (*Shop New In* / *Shop Bestsellers*). If you set a custom hero image in Admin, that image replaces the video.
- **The CityGirl Favourites** best-sellers section, a **reviews** section (*The CityGirls Love Us*), and a **Follow the CityGirl Life** Instagram grid.

**Navigation & shop**
- Shop-first nav: **New In · Dresses · Sets · Tops · Bottoms · Accessories · Bestsellers** (+ About, Contact), a **search** icon (type to find any piece), and the bag.
- Shop page supports `?filter=new`, `?filter=bestsellers`, and `?cat=<category>`.
- Categories renamed: *Co-ord Sets → Sets*, *Skirts & Shorts → Bottoms*.

**Product quick-view (tap any product)**
- Photo **gallery** with thumbnails, **size selector**, **MODEL IS WEARING** line, fabric / stretch / fit / care / delivery specs, star rating, **Add to Bag** + **Buy Now**, and a *Chat with a CityGirl stylist* WhatsApp link. Selected **size flows into the bag, checkout and WhatsApp order**.

**Floating WhatsApp** — a fixed *Chat with CityGirl* button on every page (opens WhatsApp pre-filled).

**Bug fixes** — mobile horizontal-overflow (white gap on the right) removed; quick-view **close button is now always reachable** on mobile (tall modals scroll).

**Editing product details:** name, price, category, tag, image and description are editable in **Admin**. The richer fields (sizes, gallery images, fabric, care, model info, bestseller flag, rating) live in `assets/js/store-data.js` for now and are **preserved** when you save in Admin. Photos are placeholders (loremflickr) — swap the `image`/`images` values for your own shots.

> **Existing browser?** Because saved content lives in `localStorage`, open **Admin → Reset to Sample Data** once to load the new catalog, categories and hero.

---

## Update — Simple storefront look (v3.2)

The whole site now has a cleaner, simpler shop feel:

- **Header:** a menu button on the left, the CityGirl logo in the middle, and search + bag on the right. The menu slides in from the left. On the homepage the header sits see-through over the hero (logo shown in white), then turns white when you scroll. It now stays pinned to the top while you scroll (before, it scrolled away).
- **Homepage:** a full-screen hero with a big plain headline and two stacked pill buttons. Below it, in order:
  - large swipeable **New In / Trending** photo cards with a *View all* link
  - a scrolling **shipping strip**
  - a swipeable **Best Sellers** row
  - **category** photo cards
  - a **New In** row
  - the dark sliding **reviews** (*The CityGirls Love Us*) — unchanged
  - the auto-scrolling **Follow the CityGirl Life** Instagram strip — unchanged
- **Product cards:** a rounded photo with a round **bag button**, which opens the quick view so the customer picks a size, then the name and price underneath. Tags like *Sale* or *Sold Out* show as a badge on the photo. *New* and *Bestseller* don't show, because the row already says that.
- **Discount pill:** a pink pill at the bottom of every page except checkout, on phones and desktop (e.g. *10% Off*, taken from the newsletter's discount text in Admin). Tapping it opens the newsletter popup. Tapping **×** or signing up hides it until the browser tab is closed. The popup **no longer opens by itself on a timer**, so Admin's popup delay setting is no longer used.
- **WhatsApp:** now a slim **Chat** tab on the right edge of the screen.
- **Frosted header:** once you scroll, the header turns into see-through frosted glass (the page blurs behind it) on every page.
- **Letter-by-letter headings:** the hero headline and section/page headings type in one letter at a time when they come on screen (skipped for visitors who turn off animations).
- **Footer:** unchanged — still the black footer with the logo, on every page.
- **Type:** Helvetica/Arial for headings and text, Montserrat for buttons, Space Mono for the shipping strip.
- **Removed from the homepage:** the "Why CityGirl" cards, the category chips, the auto-sliding carousel, the bottom newsletter strip and the back-to-top button. The pink pill now covers the newsletter signup.

---

## Update — Production readiness (v3.3)

**Bugs fixed**
- **Live products in the bag:** live Supabase products disappeared from the bag on other pages, and checkout said "Your bag is empty". The bag now saves a snapshot of each item, and every page loads the live catalogue the same way.
- **Fake paid orders:** "Pay online" was simulated and saved orders as **paid** without any payment. It's now "Coming soon" until Paystack is set up, and only the server can mark an order paid.
- **Lost orders:** orders that failed to save still showed a confirmation. The customer now sees an error and a WhatsApp fallback.
- **Empty shop pages:** "Shop New In" and "Shop Bestsellers" showed an empty page when no products were tagged. They now fall back to the latest pieces.
- **Shop back button:** the phone's Back button didn't update the shop page after choosing a category. The tab title now follows the category too.
- **Contact form:** the form pretended to send but sent nothing. It now opens WhatsApp with the message filled in, with an email fallback.
- **Stacked popups:** popups and drawers could stack on top of each other. The page now stops scrolling behind them, and Escape closes them.
- **Stock photos:** placeholder photos on About and in the Instagram strip are replaced with the shop's own photos.
- **Storage errors:** the bag no longer breaks in private browsing or when browser storage is full. Bag quantities are capped at 20 per item.
- **Newsletter:** emails are stored lower-case, and duplicate signups no longer error.

**SEO:** every page has its own title and description, a canonical link, and Open Graph and Twitter tags. Links shared on WhatsApp, Instagram and X now show a preview with the branded image `assets/img/og-image.jpg`. The homepage also has store details for Google (`ClothingStore` structured data), and the site has `robots.txt`, `sitemap.xml` and a branded `404.html`.

**Speed:** fonts load from the page head instead of a render-blocking `@import`, and the Supabase scripts load at the end of the page.

**Production settings:** `vercel.json` adds security headers and image caching, and marks admin and checkout as no-store and noindex. `.vercelignore` keeps tests, SQL files and docs off the public site.

**Animations:**
- swipe rows glide in card by card
- collection photos unveil as you scroll to them
- the hero settles in with a slow zoom
- menu links slide in one by one
- a bag-count pop and an "Added to bag" toast
- a shine across the pink pill
- button press feedback and page fade-in

All of these switch off for visitors who reduce motion on their device.

**My Orders (v3.4).** Customers now have a **My Orders** page (`orders.html`, also at `/orders`). It's linked from the menu, the footer, the order confirmation and the empty bag, and the homepage shows a "Your recent order" card for 60 days after an order.
- The page lists the orders placed on that phone or computer, with the items, total, delivery details and an "Ask about this order" WhatsApp button.
- **Live status** (Order placed → Paid → On its way → Cancelled) follows what you set in Admin → Sales, once you've run **`supabase/order-status.sql`** once in Supabase → SQL Editor. Until then, orders show as "Order placed".
- **Find an order:** customers can look up an order placed on another phone with the order number plus the email they used. Nobody can see anyone else's orders.

**Caching:** every script and style link carries `?v=…`. Bump that version string in all `.html` files whenever you change CSS or JS, so browsers fetch the new files straight away.
