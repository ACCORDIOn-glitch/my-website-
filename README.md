# Ayoola Enterprise - storefront

Wholesale and retail storefront for foodstuffs, frozen fish, poultry and drinks.
Static site: no build step, no framework, no monthly fees.

```
index.html            home
shop.html             catalogue with filters and search
cart.html             cart + checkout
about.html            owner, what we sell, delivery, payments
assets/
  site.css            all styling
  products.js         <-- EDIT THIS: your catalogue, prices, bank details
  shop.js             cart, filters, order submission
  fonts/              self-hosted, no external requests
  img/products/       <-- DROP PRODUCT PHOTOS HERE
google-apps-script/
  order-emailer.gs    the Gmail order receiver
```

---

## 1. Change your prices and products

Open `assets/products.js`. Everything is in one place.

```js
{ id:'rice50', cat:'foodstuffs', name:'Long Grain Rice', unit:'50kg bag',
  photo:'rice.jpg',
  sizes:[ {label:'5kg', price:9500}, {label:'25kg', price:44000} ] }
```

- `price` is in **naira**, numbers only. `9500` shows as `₦9,500`.
- Add `was: 92000` to a size to show a struck-through original and a
  "Save N%" badge.
- `cat` must match one of the `CATEGORIES` ids at the top of the file.
- To hide a product while it is out of stock, delete it from `PRODUCTS`.

Also update the shop details near the top of the same file:

```js
phone:     '+234 800 000 0000',
whatsapp:  '2348000000000',     // digits only, no +
email:     'orders@ayoolaenterprise.com',
bank: { bank:'Bank Name', accountName:'Ayoola Enterprise', accountNumber:'0000000000' },
deliveryFee: 3500,
freeDeliveryOver: 50000,
```

When your real prices are in, set `showPriceNotice: false` to remove the
"sample catalogue" ribbon from the front page.

### All current prices are placeholders

I invented them to show you how the layout looks. **Do not go live until they
are replaced.** The ribbon on the homepage will remind you.

## 2. Add product photos

Drop files into `assets/img/products/` using the `photo` filename from
`products.js` (`rice.jpg`, `beans.jpg`, `tilapia.jpg` and so on).

Use square images, about 600 x 600, under 60 KB each. Any photo you have not
added yet simply shows the product name in a grey tile instead of a broken
image, so the site is never broken.

Category tiles work the same way: `cat-foodstuffs.jpg`, `cat-frozen.jpg`,
`cat-drinks.jpg`, `cat-oils.jpg`, `cat-snacks.jpg`, `cat-bundles.jpg`.
Your own portrait for the owner section is `owner.jpg`.

## 3. Turn on Gmail order notifications (about 10 minutes, once)

The site is static, so it cannot send email by itself. This uses a free Google
Apps Script instead.

1. Open **https://script.google.com** and start a new project.
2. Delete the placeholder code. Open `google-apps-script/order-emailer.gs`,
   copy all of it, and paste it in. Save.
3. At the top of the script, change `OWNER_EMAIL` to your Gmail address and
   `WHATSAPP` to your number.
4. Click **Deploy > New deployment > Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the Web App URL that ends in `/exec`.
6. Open that URL in a browser once and approve the permissions it asks for.
7. Paste the URL into `assets/products.js`:
   ```js
   orderEndpoint: 'https://script.google.com/macros/s/AKfy.../exec',
   ```

From then on every order:
- is appended to a **Google Sheet** called `Orders` (created automatically)
- emails **you** the full order
- emails **the customer** their receipt
- sends a **WhatsApp** link in the receipt if you set `WHATSAPP`

If you skip this step the site still works: it falls back to opening the
customer's email app with the order written out, so nothing is lost.

## 4. Before you publish

Replace these placeholder strings:

- `OWNER NAME HERE` on `index.html` and `about.html`
- the About copy describing the owner (two paragraphs currently explain
  that they are placeholders)
- `https://ayoolaenterprise.com/` in the canonical and Open Graph tags on all
  four pages, plus `robots.txt` and `sitemap.xml`, once you have your domain
- the demo quote on the About page, if you would rather not use it

## The receipt

When an order is sent, the customer gets a real receipt document:

- shown on the page straight after checkout
- **Print or save as PDF** button, with a print stylesheet that strips the
  site away and leaves a clean black-on-white document
- saved in their browser and listed under "Your previous receipts" on the
  cart page, so they can reopen and reprint it any time
- emailed to them in the same layout, as a proper HTML email receipt

## Colours

The palette is the same as the Atlas portfolio site: near-black ground
(`#0b0b0c`), warm off-white type (`#e9e7e2`), one burnt-orange accent
(`#c2600f`). Change it in one place, at the top of `assets/site.css`.

## 5. Deploy with GitHub and Cloudflare

1. Go to **github.com** and create a new repository, for example
   `ayoola-enterprise`. Tick "Add a README file" so GitHub shows an upload box.
2. On the repository page, drag in everything from this folder. Keep the
   `assets` folder as a folder, not loose files.
3. Go to **dash.cloudflare.com** > **Workers & Pages** > **Create** >
   **Connect to Git**.
4. Choose your account, then the repository.
5. Build settings: leave them all empty.
   - Framework preset: **None**
   - Build command: **leave blank**
   - Build output directory: **leave blank**
6. Save and Deploy.

Your site is live in about a minute at `ayoola-enterprise.pages.dev`, and
every change you push to GitHub afterwards redeploys automatically.

No GitHub token or API key is needed for this route. Please do not paste any
token or key into a chat window.

## 6. Deploy without GitHub

- **Netlify** - drag the folder onto app.netlify.com/drop
- **Cloudflare Pages** - Workers & Pages > Create > Upload assets

Either way there is no build command and no framework preset.

## The three ways customers order

1. **Shop and send the cart** - add items, send the order, pay by transfer.
2. **Do not know what to buy** - tell them who it is for and your budget on
   the request form. You build the basket, call them, and only then take money.
3. **Transfer first** - the bank details are on the home page with an
   "I have sent the money" button that notifies you.

All three go through the same script, so all three arrive in your inbox and
your Orders sheet.

## A few things worth knowing

- Prices are stored in naira as plain numbers so you can edit them quickly.
  If you need to price in dollars, change `money()` in `products.js`.
- The cart lives in the browser's local storage. Clearing site data empties it,
  which is normal and acceptable for this kind of shop.
- The catalogue is rendered by JavaScript. Google reads JavaScript, but if
  you want product pages ranking individually for search later, that is
  worth adding.
- The site does not take card payment. It uses bank transfer, which is what
  you asked for and is more reliable for orders of this size.