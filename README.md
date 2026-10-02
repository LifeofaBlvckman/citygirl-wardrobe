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

`checkout.html` is a real checkout: it reads the bag, collects contact and
delivery details (with validation), picks a **country** (Nigeria shows state options; anywhere else takes a region + worldwide shipping), shows a live order
summary, and places an order — ending on a confirmation screen with an order
reference. Two integration points are already scaffolded and clearly commented:

- **Paystack** — set `PAYSTACK_PUBLIC_KEY` at the top of the checkout script to
  your public key (`pk_live_…`/`pk_test_…`). While it's empty the checkout runs
  in **demo mode**: the online-payment step is simulated so you can test the full
  flow without charging a card. The live `PaystackPop` call is already wired.
  The public key is safe to expose; your **secret key must stay server-side**, and
  you should **verify each transaction reference server-side** before fulfilling.
- **Database** — orders are saved through `CGW.saveOrder()` (in `store-data.js`),
  which currently writes to `localStorage`. Point `saveOrderToBackend()` in
  `checkout.html` (and `getOrders()`/`saveOrder()` in `store-data.js`) at your API
  to persist real orders.

Customers can still order over WhatsApp from the bag drawer as an alternative.

## Assets

- `assets/img/logo.png` — the brand logo (used in nav, footer, popups, favicon)
- `assets/img/hero-red-dress*.jpg` — the homepage hero (the site's only colour)
- Product and About images are still stock placeholders (grayscale on the site,
  colour on hover). Replace them with real photos via Admin (image **URLs**).

## Before going live

- Change the admin passcode from the default (`citygirl123`). Note it's a soft,
  front-end-only lock — real admin security needs a backend login.
- Replace the WhatsApp number, Instagram handle and email with the real ones.
- Add your Paystack public key and stand up a small backend to verify payments
  and store orders.
- Swap the placeholder product/About images for real photography.
- If you tested earlier builds in this browser, click **Reset to Sample Data** in
  Admin (or clear the site's localStorage) so the new monochrome theme and red
  hero defaults load.

---

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
