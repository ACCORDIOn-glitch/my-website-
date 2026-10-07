/* ===========================================================
   AYOOLA ENTERPRISE - storefront engine
   Renders the catalogue, manages the cart, and posts orders.
   =========================================================== */
(function () {
'use strict';

const A = window.AYOOLA;
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

/* ---------------- PHOTOS ----------------
   Invisible until the file actually decodes, so a missing
   photo shows the typographic placeholder instead of a gap. */
function wirePhotos(root) {
  $$('img[data-photo]', root).forEach(img => {
    const show = () => {
      if (img.naturalWidth > 0) img.classList.add('ok');
      else img.remove();
    };
    if (img.complete) show();
    else { img.addEventListener('load', show, { once: true });
           img.addEventListener('error', () => img.remove(), { once: true }); }
  });
}

/* ---------------- CARD ---------------- */
function cardHTML(p) {
  const off = A.discount(p);
  const sizes = p.sizes.map((s, i) =>
    `<button type="button" data-size="${i}" aria-pressed="${i === 0}">${s.label}</button>`).join('');

  return `
  <article class="card" data-id="${p.id}" data-cat="${p.cat}">
    ${off ? `<span class="badge">-${off}%</span>` : ''}
    <div class="ph">
      <img data-photo="${p.photo || ''}" alt="${p.name}" width="600" height="600" loading="lazy" decoding="async">
      <span class="ph-txt">${p.name}</span>
    </div>
    <h3>${p.name}</h3>
    <div class="price"><b data-price>${A.money(A.from(p))}</b>${p.sizes.some(s=>s.was) ? '<s data-was></s>' : ''}</div>
    ${off ? `<p class="off">Save ${off}%</p>` : '<p class="off" hidden></p>'}
    <p class="unit">${p.unit}</p>
    ${p.sizes.length > 1 ? `<div class="opt" role="group" aria-label="Choose a size">${sizes}</div>` : ''}
    <button class="btn btn-brand btn-sm add" type="button" data-add="${p.id}">Add to cart</button>
  </article>`;
}

function paintSize(card) {
  const p = A.PRODUCTS.find(x => x.id === card.dataset.id);
  const btn = $('[data-add]', card);
  const i = Number(btn.dataset.size || 0);
  const s = p.sizes[i];
  $('[data-price]', card).textContent = A.money(s.price);
  const was = $('[data-was]', card);
  if (s.was) { was.textContent = A.money(s.was); was.hidden = false; }
  else if (was) was.hidden = true;
  $$('.opt button', card).forEach((b, n) => b.setAttribute('aria-pressed', String(n === i)));
}

/* ---------------- GRIDS ---------------- */
function renderGrid(el, list) {
  el.innerHTML = list.map(cardHTML).join('');
  $$('.card', el).forEach(paintSize);
  wirePhotos(el);
}

/* ---------------- CART ---------------- */
const KEY = 'ayoola.cart.v1';
const cart = {
  read() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (_) { return []; } },
  write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    paintCount();
    document.dispatchEvent(new CustomEvent('cart:change'));
  },
  add(id, sizeIndex) {
    const items = this.read();
    const found = items.find(i => i.id === id && i.size === sizeIndex);
    if (found) found.qty += 1;
    else items.push({ id, size: sizeIndex, qty: 1 });
    this.write(items);
  },
  setQty(id, sizeIndex, qty) {
    let items = this.read();
    if (qty <= 0) items = items.filter(i => !(i.id === id && i.size === sizeIndex));
    else items.forEach(i => { if (i.id === id && i.size === sizeIndex) i.qty = qty; });
    this.write(items);
  },
  clear() { this.write([]); },
  count() { return this.read().reduce((n, i) => n + i.qty, 0); },
  total() {
    return this.read().reduce((sum, i) => {
      const p = A.PRODUCTS.find(x => x.id === i.id);
      if (!p) return sum;
      return sum + p.sizes[i.size].price * i.qty;
    }, 0);
  },
};

function paintCount() {
  const n = cart.count();
  $$('[data-cart-count]').forEach(el => {
    el.textContent = n;
    el.style.visibility = n ? 'visible' : 'hidden';
  });
}

/* ---------------- ADD TO CART ---------------- */
document.addEventListener('click', (e) => {
  const sizeBtn = e.target.closest('.opt button');
  if (sizeBtn) {
    const card = sizeBtn.closest('.card');
    const add = $('[data-add]', card);
    add.dataset.size = sizeBtn.dataset.size;
    paintSize(card);
    return;
  }

  const add = e.target.closest('[data-add]');
  if (add) {
    const id = add.dataset.add;
    const size = Number(add.dataset.size || 0);
    cart.add(id, size);
    const p = A.PRODUCTS.find(x => x.id === id);
    const label = p.sizes[size].label;
    const prev = add.textContent;
    add.textContent = 'Added';
    add.disabled = true;
    setTimeout(() => { add.textContent = prev; add.disabled = false; }, 1100);
    toast(`${p.name} (${label}) added`);
  }
});

function toast(msg) {
  let t = $('#toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;left:50%;bottom:20px;translate:-50% 0;background:#15171a;color:#fff;padding:.6rem 1.1rem;border-radius:3px;font-size:.85rem;z-index:9000;opacity:0;transition:opacity .2s';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._h);
  t._h = setTimeout(() => { t.style.opacity = '0'; }, 1800);
}

/* ---------------- SHOP PAGE ---------------- */
function initShop() {
  const grid = $('#shopGrid');
  if (!grid) return;

  const q = $('#q'), sort = $('#sort');
  const boxes = $$('#facets input[type=checkbox]');
  let state = { q: '', cats: [], sort: 'featured' };

  function apply() {
    let list = A.PRODUCTS.slice();

    if (state.cats.length) list = list.filter(p => state.cats.includes(p.cat));

    const term = state.q.trim().toLowerCase();
    if (term) list = list.filter(p =>
      (p.name + ' ' + p.unit + ' ' + p.cat).toLowerCase().includes(term));

    if (state.sort === 'low')  list.sort((a, b) => A.from(a) - A.from(b));
    if (state.sort === 'high') list.sort((a, b) => A.from(b) - A.from(a));
    if (state.sort === 'az')   list.sort((a, b) => a.name.localeCompare(b.name));

    renderGrid(grid, list);
    $('#count').textContent = list.length + (list.length === 1 ? ' product' : ' products');
    $('#empty').hidden = list.length > 0;
  }

  q.addEventListener('input', () => { state.q = q.value; apply(); });
  sort.addEventListener('change', () => { state.sort = sort.value; apply(); });
  boxes.forEach(b => b.addEventListener('change', () => {
    state.cats = boxes.filter(x => x.checked).map(x => x.value);
    apply();
  }));

  $('#catOnly')?.addEventListener('click', (e) => {
    e.preventDefault();
    const id = $('#catOnly').dataset.cat;
    state.cats = [id];
    boxes.forEach(b => { b.checked = b.value === id; });
    apply();
  });

  apply();
}

/* ---------------- CART PAGE ---------------- */
function initCart() {
  const wrap = $('#cartLines');
  if (!wrap) return;

  function paint() {
    const items = cart.read();
    if (!items.length) {
      wrap.innerHTML = '<p class="empty">Your cart is empty.</p>';
      $('#summary').hidden = true;
      $('#checkoutBlock').hidden = true;
      return;
    }
    $('#summary').hidden = false;
    $('#checkoutBlock').hidden = false;

    wrap.innerHTML = items.map(i => {
      const p = A.PRODUCTS.find(x => x.id === i.id);
      const s = p.sizes[i.size];
      return `
      <div class="line" data-id="${i.id}" data-size="${i.size}">
        <div class="ph">
          <img data-photo="${p.photo || ''}" alt="${p.name}" width="200" height="200" loading="lazy">
          <span class="ph-txt">${p.name}</span>
        </div>
        <div>
          <h3>${p.name}</h3>
          <p>${s.label} &middot; ${A.money(s.price)} each</p>
          <button class="rm" type="button" data-rm>Remove</button>
        </div>
        <div class="qty">
          <button type="button" data-dec aria-label="Reduce quantity">&minus;</button>
          <span>${i.qty}</span>
          <button type="button" data-inc aria-label="Increase quantity">+</button>
        </div>
        <div class="amt">${A.money(s.price * i.qty)}</div>
      </div>`;
    }).join('');

    wirePhotos(wrap);

    const sub = cart.total();
    const fee = (sub >= A.CONFIG.freeDeliveryOver || sub === 0) ? 0 : A.CONFIG.deliveryFee;
    $('#sub').textContent = A.money(sub);
    $('#fee').textContent = fee ? A.money(fee) : 'Free';
    $('#tot').textContent = A.money(sub + fee);
    $('#feeRow').hidden = fee === 0;
  }

  wrap.addEventListener('click', (e) => {
    const line = e.target.closest('.line');
    if (!line) return;
    const id = line.dataset.id, size = Number(line.dataset.size);
    const cur = cart.read().find(i => i.id === id && i.size === size);
    if (e.target.closest('[data-inc]')) cart.setQty(id, size, (cur ? cur.qty : 0) + 1);
    else if (e.target.closest('[data-dec]')) cart.setQty(id, size, (cur ? cur.qty : 1) - 1);
    else if (e.target.closest('[data-rm]')) cart.setQty(id, size, 0);
    paint();
  });

  $('#checkoutBlock')?.addEventListener('submit', submitOrder);
  document.addEventListener('cart:change', paint);
  paint();
}

/* ---------------- RECEIPT ----------------
   A real document the customer can read, save or print.
   Saved to the browser so they can reopen it later. */
const RECEIPTS_KEY = 'ayoola.receipts.v1';

const receipts = {
  all() { try { return JSON.parse(localStorage.getItem(RECEIPTS_KEY)) || []; } catch (_) { return []; } },
  save(r) {
    const list = this.all();
    list.unshift(r);
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(list.slice(0, 20)));
  },
  find(ref) { return this.all().find(r => r.ref === ref) || null; },
  clear() { localStorage.removeItem(RECEIPTS_KEY); },
};

function receiptHTML(r) {
  const rows = (r.items || []).map(i => `
    <tr>
      <td class="name">${i.item}</td>
      <td class="num">${i.qty}</td>
      <td class="num">${A.money(i.price)}</td>
      <td class="num">${A.money(i.line)}</td>
    </tr>`).join('');

  const paid = 'Awaiting bank transfer';

  return `
  <div class="rcpt">
    <div class="rcpt-head">
      <div class="rcpt-brand">
        <b>Ayoola Enterprise</b>
        <p>Wholesale &amp; retail foodstuffs, frozen fish and drinks</p>
      </div>
      <div class="rcpt-meta">
        <b>Order receipt</b>
        Ref: ${r.ref}<br>
        ${new Date(r.at).toLocaleString('en-NG')}<br>
        Status: ${paid}
      </div>
    </div>

    <div class="rcpt-parties">
      <div>
        <h4>Customer</h4>
        <p>
          ${r.name || '-'}<br>
          ${r.phone || ''}<br>
          ${r.email || ''}
        </p>
      </div>
      <div>
        <h4>Delivery address</h4>
        <p>
          ${r.address || 'Not given'}<br>
          ${r.state || ''}
        </p>
      </div>
    </div>

    <table class="rcpt-table">
      <thead>
        <tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Amount</th></tr>
      </thead>
      <tbody>${rows || '<tr><td class="name" colspan="4">No items on this order.</td></tr>'}</tbody>
      <tfoot>
        <tr><td colspan="3" class="lbl num">Subtotal</td><td class="num">${A.money(r.subtotal || 0)}</td></tr>
        <tr><td colspan="3" class="lbl num">Delivery</td><td class="num">${r.delivery ? A.money(r.delivery) : 'Free'}</td></tr>
        <tr class="tot"><td colspan="3" class="lbl num">Total</td><td class="num">${A.money(r.total || 0)}</td></tr>
      </tfoot>
    </table>

    <div class="rcpt-foot">
      <h4>How to pay</h4>
      <p>Transfer <strong>${A.money(r.total || 0)}</strong> to the account on the Ayoola Enterprise website and quote reference <strong>${r.ref}</strong>.</p>
      <p>We will confirm the transfer by email, then pack and deliver. Keep this reference for your records.</p>
      ${r.note ? '<h4 style="margin-top:1rem">Your note</h4><p>' + r.note + '</p>' : ''}
      <h4 style="margin-top:1rem">Questions</h4>
      <p>WhatsApp ${A.CONFIG.phone} or email ${A.CONFIG.email} quoting ${r.ref}.</p>
    </div>
  </div>`;
}

function showReceipt(ref) {
  const host = $('#receiptHost');
  if (!host) return;
  const r = receipts.find(ref) || (window.__lastReceipt && window.__lastReceipt.ref === ref ? window.__lastReceipt : null);
  if (!r) return;
  host.innerHTML =
    receiptHTML(r) +
    `<div class="rcpt-acts">
       <button class="btn btn-ink" type="button" onclick="window.print()">Print or save as PDF</button>
       <a class="btn btn-ghost" href="/shop.html">Keep shopping</a>
     </div>`;
  host.hidden = false;
}

function paintReceiptList() {
  const host = $('#pastReceipts');
  if (!host) return;
  const list = receipts.all();
  host.hidden = list.length === 0;
  if (!list.length) return;
  host.innerHTML = list.map(r =>
    `<a href="#" data-rref="${r.ref}">
       <span>${r.ref}</span>
       <span>${new Date(r.at).toLocaleDateString('en-NG')} &middot; ${A.money(r.total || 0)}</span>
     </a>`).join('');
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-rref]');
  if (!a) return;
  e.preventDefault();
  showReceipt(a.dataset.rref);
  $('#receiptHost')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* ---------------- ORDER SUBMISSION ---------------- */
function orderPayload(extra) {
  const items = cart.read().map(i => {
    const p = A.PRODUCTS.find(x => x.id === i.id);
    const s = p.sizes[i.size];
    return {
      item: p.name + ' (' + s.label + ')',
      size: s.label,
      qty: i.qty,
      price: s.price,
      line: s.price * i.qty,
    };
  });

  const sub = items.reduce((n, i) => n + i.line, 0);
  const fee = sub >= A.CONFIG.freeDeliveryOver ? 0 : A.CONFIG.deliveryFee;

  return Object.assign({
    ref: 'AY-' + Date.now().toString(36).toUpperCase(),
    items,
    subtotal: sub,
    delivery: fee,
    total: sub + fee,
  }, extra);
}

async function postOrder(payload) {
  const url = A.CONFIG.orderEndpoint;
  if (!url) return { ok: false, fallback: true };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return { ok: true };
  } catch (err) {
    console.warn('Order endpoint failed, falling back to email draft.', err);
    return { ok: false, fallback: true };
  }
}

function mailDraft(payload) {
  const rows = (payload.items || []).map(i =>
    `${i.qty} x ${i.item}  ${A.money(i.line)}`).join('\n');

  const body = [
    'NEW ORDER from the Ayoola Enterprise website',
    '',
    'Reference: ' + payload.ref,
    payload.name ? 'Name: ' + payload.name : '',
    payload.phone ? 'Phone: ' + payload.phone : '',
    payload.email ? 'Email: ' + payload.email : '',
    payload.address ? 'Delivery address: ' + payload.address : '',
    payload.state ? 'State: ' + payload.state : '',
    payload.note ? 'Notes: ' + payload.note : '',
    payload.budget ? 'Budget for us to work with: ' + A.money(payload.budget) : '',
    '',
    payload.items ? 'ITEMS' : 'REQUEST',
    payload.items ? rows : (payload.request || ''),
    '',
    'Subtotal: ' + A.money(payload.subtotal || 0),
    payload.delivery ? 'Delivery: ' + A.money(payload.delivery) : '',
    'TOTAL: ' + A.money(payload.total || 0),
  ].filter(Boolean).join('\n');

  return `mailto:${A.CONFIG.email}?subject=${encodeURIComponent('New order ' + payload.ref)}&body=${encodeURIComponent(body)}`;
}

function submitOrder(e) {
  e.preventDefault();
  const form = e.target;
  const msg = $('#orderMsg');
  const btn = form.querySelector('[type=submit]');
  const d = new FormData(form);

  const payload = orderPayload({
    name:  String(d.get('name') || '').trim(),
    phone: String(d.get('phone') || '').trim(),
    email: String(d.get('email') || '').trim(),
    address: String(d.get('address') || '').trim(),
    state: String(d.get('state') || '').trim(),
    note: String(d.get('note') || '').trim(),
    kind: 'order',
  });

  const say = (t, cls) => { msg.textContent = t; msg.className = 'msg on ' + cls; };
  if (!payload.name || !payload.phone) return say('Please add your name and phone number.', 'err');

  btn.disabled = true;
  say('Sending your order...', '');

  postOrder(payload).then(res => {
    const record = Object.assign({}, payload, { at: Date.now() });
    receipts.save(record);
    window.__lastReceipt = record;
    paintReceiptList();

    if (res.ok) {
      cart.clear();
      say('Order received. Your receipt is below and a copy is on its way to your email.', 'ok');
      form.reset();
    } else {
      say('Your order is ready. Send the email that has just opened, then your receipt is below.', 'ok');
      setTimeout(() => { window.location.href = mailDraft(payload); }, 400);
    }

    showReceipt(record.ref);
    btn.disabled = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------------- CONCIERCE ("just sort it for me") ---------------- */
function initConcierge() {
  const form = $('#conciergeForm');
  if (!form) return;
  const msg = $('#conciergeMsg');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const budget = Number(String(d.get('budget') || '0').replace(/[^\d]/g, ''));

    const payload = orderPayload({
      name:  String(d.get('name') || '').trim(),
      phone: String(d.get('phone') || '').trim(),
      email: String(d.get('email') || '').trim(),
      address: String(d.get('address') || '').trim(),
      state: String(d.get('state') || '').trim(),
      note: String(d.get('note') || '').trim(),
      kind: 'concierge',
      request: String(d.get('request') || '').trim() || 'No specific request - please choose for us.',
      budget: budget || 0,
    });

    const say = (t, cls) => { msg.textContent = t; msg.className = 'msg on ' + cls; };
    if (!payload.name || !payload.phone) return say('Please add your name and phone number.', 'err');

    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    say('Sending...', '');

    postOrder(payload).then(res => {
      if (res.ok) {
        say('Received. We will call you within 24 hours to agree the basket before taking any money.', 'ok');
        form.reset();
      } else {
        say('Opening your email app...', 'ok');
        window.location.href = mailDraft(payload);
      }
      btn.disabled = false;
    });
  });

  // "I have sent the money" - tells the company a transfer landed
  const paid = $('#paidForm');
  if (paid) {
    paid.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = new FormData(paid);
      const payload = orderPayload({
        name: String(d.get('name') || '').trim(),
        phone: String(d.get('phone') || '').trim(),
        kind: 'payment-notified',
        request: 'Customer says a transfer has been made. Please confirm receipt and start packing.',
        items: [],
        subtotal: 0, delivery: 0, total: 0,
      });
      const pmsg = $('#paidMsg');
      const say = (t, c) => { pmsg.textContent = t; pmsg.className = 'msg on ' + c; };
      if (!payload.name || !payload.phone) return say('Add your name and phone.', 'err');

      postOrder(payload).then(res => {
        if (res.ok) { say('Notified. We will confirm your transfer shortly.', 'ok'); paid.reset(); }
        else { say('Opening your email app...', 'ok'); window.location.href = mailDraft(payload); }
      });
    });
  }
}

/* ---------------- HOME ---------------- */
function initHome() {
  const fg = $('#featured');
  if (fg) renderGrid(fg, A.PRODUCTS.slice(0, 8));

  const cats = $('#catGrid');
  if (cats) {
    cats.innerHTML = A.CATEGORIES.map(c => `
      <a href="/shop.html#shop" data-cat="${c.id}">
        <div class="ph">
          <img data-photo="${c.photo}" alt="${c.name}" width="300" height="300" loading="lazy">
        </div>
        <b>${c.name}</b>
        <span>${c.note}</span>
      </a>`).join('');
    wirePhotos(cats);
  }

  // config -> page
  const set = (sel, val) => { const el = $(sel); if (el) el.textContent = val; };
  set('[data-phone]', A.CONFIG.phone);
  set('[data-email]', A.CONFIG.email);
  set('#bankName', A.CONFIG.bank.bank);
  set('#acctName', A.CONFIG.bank.accountName);
  set('#acctNo', A.CONFIG.bank.accountNumber);

  const wa = $('[data-wa]');
  if (wa) {
    wa.href = 'https://wa.me/' + A.CONFIG.whatsapp;
    $$('[data-wa]').forEach(x => x.href = 'https://wa.me/' + A.CONFIG.whatsapp);
  }

  const notice = $('#priceNotice');
  if (notice) notice.hidden = !A.CONFIG.showPriceNotice;
}

/* ---------------- CATEGORY PREFILL FROM HASH ---------------- */
function initHashCat() {
  const m = /^#cat-(.+)$/.exec(location.hash);
  if (m) {
    const a = document.querySelector('[data-cat="' + m[1] + '"]');
    if (a) setTimeout(() => a.click(), 60);
  }
}

/* ---------------- BOOT ---------------- */
function boot() {
  paintCount();
  initHome();
  initShop();
  initCart();
  initConcierge();
  initHashCat();
  paintReceiptList();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();