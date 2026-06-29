# Aurora Flower Shop

A small, serverless floral catalog with a public shop and an RLS-protected admin studio. The frontend is plain HTML, CSS, and JavaScript; Cloudflare Pages hosts it, while hosted Supabase provides the database, email/password authentication, and product-image storage.

## Phase 1: Architecture And Project Plan

### How the pieces fit

1. A customer requests the static site from **Cloudflare Pages**.
2. Browser JavaScript uses the **Supabase project URL and public anon key** to request catalog data.
3. **Postgres Row Level Security (RLS)** decides which rows that request may read or change.
4. **Supabase Auth** creates a browser session after the admin signs in.
5. An `admin_users` row links the Auth user's UUID to admin permission. The `is_admin()` database function checks that allowlist inside every write policy.
6. **Supabase Storage** holds product images. Public reads display them; only allowlisted admins can upload or delete them.

There is no traditional server, Docker container, or production dependency on your computer. This is a good small-shop fit because both services have low-maintenance free tiers, deployment is a Git push, and RLS keeps authorization beside the data it protects.

The anon key identifies your Supabase project and is intentionally safe to use in browser code **when RLS is correct**. The `service_role` key bypasses RLS and must never be added to this repository, Cloudflare frontend code, or a browser.

### Project map

```text
aurora-flower-shop/
├── assets/
│   ├── aurora-hero.png       # Decorative homepage photograph
│   └── aurora-boutique.png   # Blurred story-section background
├── css/
│   └── styles.css            # Shared design system and responsive UI
├── js/
│   ├── admin-login.js        # Password login and allowlist check
│   ├── admin.js              # Route guard, CRUD, and image uploads
│   ├── catalog.js            # Public catalog fetching and filters
│   ├── config.js             # Public Supabase URL and anon key
│   ├── i18n.js               # Vietnamese-first public translations
│   ├── site.js               # Navigation on non-catalog public pages
│   ├── supabase-client.js    # One shared Supabase client
│   └── ui.js                 # Safe rendering and shared UI helpers
├── supabase/
│   ├── schema.sql            # Tables, trigger, RLS, and Storage policies
│   └── seed.sql              # Optional sample products
├── index.html                # Landing page and featured products
├── shop.html                 # Full catalog and category dropdown
├── contact.html              # Contact details and social links
├── admin-login.html          # Private studio sign-in
└── admin.html                # Product management dashboard
```

Vite is deliberately omitted. This project has few modules and no compile-time needs, so a build tool would add commands and dependencies without making the site meaningfully clearer. Native ES modules keep deployment to a single static directory.

## Phase 2: Supabase Setup

### 1. Create the project

1. Sign in at [supabase.com](https://supabase.com) and choose **New project**.
2. Choose a strong database password and save it in a password manager.
3. Select the region closest to most customers and wait for provisioning.
4. Open **SQL Editor**, create a query, paste all of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
5. Optional: run [`supabase/seed.sql`](supabase/seed.sql) to add three starter records.

The schema uses UUID primary keys, VND prices, simple booleans, automatic timestamps, and `is_active` for hiding a product without deleting it. Vietnamese product names and descriptions are primary; optional `name_en` and `description_en` fields support the English toggle. `image_path` accompanies `image_url` so replaced files can be removed cleanly from Storage.

### 2. Create the first admin

1. In **Authentication > Providers > Email**, keep Email enabled.
2. For a private one-admin site, disable public sign-ups. The dashboard label may be **Allow new users to sign up**.
3. Go to **Authentication > Users > Add user > Create new user**.
4. Enter the admin email and a unique password. Mark the email confirmed if the dashboard offers that choice.
5. Copy the new user's UUID from the Users table.
6. In SQL Editor, run this with the real UUID:

```sql
insert into public.admin_users (user_id)
values ('PASTE-THE-AUTH-USER-UUID-HERE');
```

The UUID allowlist is preferable to checking an email string: Auth owns identities, changing an email does not silently remove permission, and the browser cannot grant itself access. The `admin_users` table has RLS with no client-facing policies, so clients cannot read or edit the allowlist. The security-definer `is_admin()` function exposes only a true/false result.

### 3. Confirm security and Storage

`schema.sql` creates the public `product-images` bucket with a 5 MB limit and common image MIME types. It also creates these rules:

- Anyone may select active products.
- An allowlisted admin may also see inactive products.
- Only allowlisted authenticated users may insert, update, or delete products.
- Anyone may view product images.
- Only allowlisted admins may upload, replace, or delete product images.

Uploads use `AUTH_USER_UUID/RANDOM_UUID.extension`. The user folder makes ownership easy to inspect; the random filename prevents collisions and avoids trusting the original filename.

## Phase 3: Frontend Structure

The full structure is already generated above. Shared behavior lives in small JavaScript modules: client initialization, reusable UI, public catalog, login, and admin management. Each HTML page has one page-specific module, while all styling lives in one readable stylesheet.

## Phase 4: Full Frontend

The complete, deployable code is in this repository. Important entry points are:

- [`index.html`](index.html): hero, welcome, featured products, story, contact, and footer.
- [`shop.html`](shop.html): all active products and category dropdown generated from the catalog.
- [`admin-login.html`](admin-login.html): email/password sign-in and admin verification.
- [`admin.html`](admin.html): product form, list, editing, deletion, stock/featured/visibility flags, and image preview.

Forms use native HTML validation plus file type/size checks. Database constraints and RLS remain the final authority even if browser validation is bypassed.

## Phase 5: Connect Supabase

1. In Supabase, open **Project Settings > API** (in some dashboard versions, **Settings > Data API**).
2. Copy the **Project URL**.
3. Copy the **anon/public key**. Newer projects may call it a publishable key; use the browser-safe public key, never `service_role`.
4. Replace the placeholders in [`js/config.js`](js/config.js):

```js
export const SUPABASE_URL = "https://your-project-id.supabase.co";
export const SUPABASE_ANON_KEY = "your-public-anon-key";
```

The Supabase client is loaded as a pinned ES module from jsDelivr. `catalog.js` selects products, `admin-login.js` handles the session, and `admin.js` performs authenticated inserts, updates, deletes, and Storage operations. The calls are visible in browser developer tools; that is expected. RLS, not hidden JavaScript, provides security.

## Phase 6: Styling And UI

The design system is defined at the top of [`css/styles.css`](css/styles.css): cream surfaces, blush and peach accents, sage actions, soft ink, `Fraunces` display type, and `DM Sans` body type. Spacing uses fluid `clamp()` values, cards use a 22 px radius, and breakpoints at 900 px and 680 px cover tablets and phones. Reduced-motion preferences are respected.

Before launch, replace the example Ho Chi Minh City address, phone number, email, and social profiles in `index.html` and `contact.html`. Also update the brand text if the shop's final name differs. Public pages default to Vietnamese; the VI/EN control remembers the visitor's choice in browser storage.

## Phase 7: Deploy To Cloudflare Pages

### Push to GitHub

Create an empty GitHub repository without adding a README, then run:

```bash
git add .
git commit -m "Build Aurora flower shop catalog"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aurora-flower-shop.git
git push -u origin main
```

### Connect Cloudflare

1. In Cloudflare Dashboard, open **Workers & Pages** and choose **Create > Pages > Connect to Git**.
2. Authorize GitHub and select the repository.
3. Choose `main` as the production branch.
4. Framework preset: **None**.
5. Build command: leave blank (or use `exit 0` only if the UI requires a value).
6. Build output directory: `/` or the repository root, depending on the current dashboard wording.
7. Deploy, then open the generated `pages.dev` URL and test every page.

Because this version has no build step, Cloudflare environment variables cannot be compiled into static JavaScript. The project URL and anon key belong in `js/config.js`; both are public by design. Do not put a service-role key in Cloudflare. A future build tool could inject public values for convenience, but it would not make them secret.

To add a domain later, open the Pages project, choose **Custom domains > Set up a custom domain**, and follow Cloudflare's DNS prompts. HTTPS is issued automatically.

## Phase 8: Testing Checklist

- [ ] Home page loads and the hero image has useful alt text.
- [ ] Featured section shows only active featured products.
- [ ] Shop loads all active products and the category dropdown works.
- [ ] Prices, descriptions, badges, and availability are correct.
- [ ] Product images display; products without images show the floral placeholder.
- [ ] Admin signs in and refresh retains the session.
- [ ] A normal Auth user not in `admin_users` is rejected.
- [ ] Opening `admin.html` while signed out redirects to login.
- [ ] Admin can add a product with and without an image.
- [ ] Admin can edit details and replace an image.
- [ ] Admin can toggle stock, featured, and shop visibility.
- [ ] Admin can delete a product and confirms first.
- [ ] A 5+ MB or non-image upload is rejected.
- [ ] In an incognito window, direct REST insert/update/delete requests fail RLS.
- [ ] Navigation and layouts work at 360 px, 768 px, and desktop widths.
- [ ] Keyboard focus is visible and forms can be completed without a mouse.
- [ ] Cloudflare's deployed URLs work after a hard refresh.

For a direct RLS sanity check, sign out, open browser DevTools on the shop, and try changing a product through the dashboard: you should be redirected before controls appear. The stronger proof is in Supabase SQL policies: `anon` has no write policy at all.

## Phase 9: Troubleshooting

| Problem | Likely fix |
|---|---|
| “Connect Supabase” message | Replace both placeholders in `js/config.js`, including quotes. |
| Products fail to load | Run `schema.sql`; confirm the project URL/key belong to the same project and inspect the browser Console/Network tabs. |
| Products exist but are missing publicly | Set `is_active` to true. The homepage also requires `featured` to be true. |
| Login fails | Confirm Email provider is enabled, user exists, password is correct, and email is confirmed. |
| Login succeeds then returns to login | Add the Auth user's exact UUID to `public.admin_users`. |
| Insert/update says RLS violation | Confirm the allowlist UUID matches `auth.users.id`, then rerun the policy section of `schema.sql`. |
| Upload says bucket not found | Rerun the Storage portion of `schema.sql` or confirm the bucket ID is exactly `product-images`. |
| Upload is rejected | Check 5 MB limit, MIME type, Storage policies, and admin allowlist membership. |
| Public image does not render | Confirm the bucket is public and `image_url` is the public URL returned by the same project. |
| Session does not persist | Do not browse in a mode that blocks site storage; verify the browser clock and Supabase project URL. |
| ES modules fail locally | Do not double-click `index.html`; use a local HTTP server as shown below. |
| Cloudflare shows 404 | Set output directory to the repository root and ensure `index.html` is at top level. |
| New GitHub changes do not appear | Check the Pages deployment log, production branch, and latest commit SHA. |

## Phase 10: Optional Improvements

Good next additions, in roughly this order:

1. Add product search and richer URL-based category metadata.
2. Add SEO metadata, Open Graph images, sitemap, and structured product data.
3. Resize/compress uploads in the browser or with a Supabase Edge Function.
4. Add a spam-protected inquiry form using Cloudflare Turnstile and an email service.
5. Add testimonials and Instagram/social links.
6. Add `sort_order` with drag-and-drop featured product ordering.
7. Add subtle page transitions while preserving reduced-motion support.
8. Add an order-request workflow before committing to full ecommerce.
9. Later, add cart and checkout through a hosted payment provider; keep secret payment keys in server-side functions, never browser code.

## Local Development

Browsers require an HTTP server for JavaScript modules. From the project directory, run:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`. Stop the server with `Ctrl+C`.

## Generated Asset

The built-in image generation tool created both project photographs. `assets/aurora-hero.png` uses a wide blush, cream, peach, and sage floral-product composition with negative space for hero copy. `assets/aurora-boutique.png` shows an airy cream, pale wood, blush, and sage flower studio designed to sit behind the softly blurred story treatment. Both prompts excluded text, logos, watermarks, people, harsh lighting, and visual clutter.
