/**
 * AYOOLA ENTERPRISE - order receiver
 * ---------------------------------------------------------------------------
 * Does four things every time an order arrives:
 *   1. Saves the order into a Google Sheet
 *   2. Emails YOU (the shop) with the full order
 *   3. Emails THE CUSTOMER their receipt
 *   4. Sends the customer a WhatsApp confirmation link if you supply a number
 *
 * SET-UP (about 10 minutes, once)
 * ---------------------------------------------------------------------------
 * 1. Open https://script.google.com and start a new project.
 * 2. Delete the placeholder code, paste this whole file in, and Save.
 * 3. Click "Deploy" > "New deployment" > type "Web app".
 *      Execute as:      Me
 *      Who has access:  Anyone            <-- important, or the site cannot post
 *    Then click Deploy and copy the Web App URL (ends in /exec).
 * 4. Open that URL in a browser once and approve the permissions.
 * 5. Paste the URL into your website:  assets/products.js, CONFIG.orderEndpoint
 * 6. Rename the 3 TODO values below to your own Gmail address and shop number.
 *
 * The Google Sheet is created automatically the first time an order arrives.
 * ---------------------------------------------------------------------------
 */

var CONFIG = {
  OWNER_EMAIL: 'TODO-your-gmail-address@gmail.com',   // <-- change this
  OWNER_NAME: 'Ayoola Enterprise',
  CUSTOMER_FROM_NAME: 'Ayoola Enterprise',
  WHATSAPP: '2348000000000',                          // digits only, no +  <-- change this
  SHEET_NAME: 'Orders'
};

/**
 * Receives the POST from the website.
 * The site sends JSON as text/plain so no CORS preflight is needed.
 */
function doPost(e) {
  try {
    var raw = e && e.postData ? e.postData.contents : '{}';
    var order = JSON.parse(raw);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/** Browsers testing the app hit this instead. */
function doGet() {
  return json({
    ok: true,
    service: 'Ayoola Enterprise order receiver',
    orders_sheet: CONFIG.SHEET_NAME
  });
}

/** Answers a CORS preflight, just in case a browser sends one. */
function doOptions() {
  return json({ ok: true });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** ------------------------------------------------------------------ */

function handle(e) {
  var order;
  try {
    order = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'Could not read the order: ' + err });
  }

  try {
    saveToSheet(order);
  } catch (err) {
    console.error('Sheet failed: ' + err);
  }

  var kind = order.kind || 'order';

  try {
    if (kind === 'order') {
      MailApp.sendEmail({
        to: CONFIG.OWNER_EMAIL,
        subject: 'New order ' + order.ref + ' - ' + money(order.total),
        body: buildOwnerEmail(order),
        htmlBody: buildReceiptHtml(order),
        replyTo: order.email || ''
      });
      if (order.email) {
        MailApp.sendEmail({
          to: order.email,
          subject: 'Your Ayoola Enterprise receipt - ' + order.ref,
          body: buildCustomerReceipt(order),
          htmlBody: buildReceiptHtml(order),
          replyTo: CONFIG.OWNER_EMAIL
        });
      }
    }

    if (kind === 'concierge') {
      MailApp.sendEmail({
        to: CONFIG.OWNER_EMAIL,
        subject: 'Budget request ' + order.ref + ' from ' + (order.name || 'a customer'),
        body: buildConciergeEmail(order),
        replyTo: order.phone || ''
      });
      if (order.email) {
        MailApp.sendEmail({
          to: order.email,
          subject: 'We received your request ' + order.ref,
          body: buildConciergeAck(order),
          replyTo: CONFIG.OWNER_EMAIL
        });
      }
    }

    if (kind === 'payment-notified') {
      MailApp.sendEmail({
        to: CONFIG.OWNER_EMAIL,
        subject: 'Transfer reported by ' + (order.name || 'a customer') + ' (' + order.ref + ')',
        body: buildPaymentEmail(order),
        replyTo: ''
      });
    }
  } catch (err) {
    console.error('Email failed: ' + err);
    return json({ ok: false, error: 'Saved but email failed: ' + err });
  }

  return json({ ok: true, ref: order.ref });
}

/* ---------------------------------------------------------------- */

function money(n) {
  return 'N' + '₦' + Number(n || 0).toLocaleString('en-NG');
}

function table(order) {
  var rows = (order.items || []).map(function (i) {
    return '• ' + i.qty + ' × ' + i.item + '  —  ' + money(i.line);
  });
  if (!rows.length) rows.push('• ' + (order.request || 'No items listed'));
  return rows.join('\n');
}

function customerBlock(order) {
  return [
    'Name:    ' + (order.name || '-'),
    'Phone:   ' + (order.phone || '-'),
    'Email:   ' + (order.email || '-'),
    'Address: ' + (order.address || '-'),
    'State:   ' + (order.state || '-')
  ].join('\n');
}

function saveToSheet(order) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet()
      .insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow([
      'Date', 'Reference', 'Type', 'Name', 'Phone', 'Email',
      'Address', 'State', 'Items', 'Subtotal', 'Delivery',
      'Total', 'Notes', 'Budget', 'Status'
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 15).setFontWeight('bold');
  }

  var items = (order.items || [])
    .map(function (i) { return i.qty + 'x ' + i.item; })
    .join(' | ');

  sheet.appendRow([
    new Date(),
    order.ref || '',
    order.kind || 'order',
    order.name || '',
    order.phone || '',
    order.email || '',
    order.address || '',
    order.state || '',
    items || (order.request || ''),
    order.subtotal || 0,
    order.delivery || 0,
    order.total || 0,
    order.note || '',
    order.budget || '',
    'New'
  ]);
}

/**
 * HTML receipt. Table-based and inline-styled, because email clients
 * strip <style> blocks and ignore modern CSS in most inboxes.
 */
function buildReceiptHtml(order) {
  var rows = (order.items || []).map(function (i) {
    return '<tr>' +
      '<td style="padding:10px 0;border-bottom:1px solid #e6e3dd;color:#1a1a1a;">' +
        esc(i.item) + '</td>' +
      '<td style="padding:10px 8px;border-bottom:1px solid #e6e3dd;color:#5c5852;text-align:center;width:44px;">' +
        i.qty + '</td>' +
      '<td style="padding:10px 8px;border-bottom:1px solid #e6e3dd;color:#5c5852;text-align:right;width:96px;">' +
        money(i.price) + '</td>' +
      '<td style="padding:10px 0;border-bottom:1px solid #e6e3dd;color:#1a1a1a;text-align:right;width:104px;font-weight:600;">' +
        money(i.line) + '</td>' +
    '</tr>';
  }).join('');

  if (!rows) {
    rows = '<tr><td colspan="4" style="padding:10px 0;color:#5c5852;">No items on this order.</td></tr>';
  }

  var delivery = order.delivery ? money(order.delivery) : 'Free';

  return '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f6f5f2;">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f5f2;padding:24px 12px;">' +
  '<tr><td align="center">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dedbd5;">' +

  // header
  '<tr><td style="padding:22px 24px;border-bottom:1px solid #e6e3dd;">' +
    '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:22px;color:#111;line-height:1;">Ayoola Enterprise</div>' +
    '<div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#8a8781;margin-top:6px;">Order receipt</div>' +
  '</td>' +
  '<td align="right" style="padding:22px 24px;border-bottom:1px solid #e6e3dd;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#5c5852;">' +
    '<strong style="display:block;font-size:14px;color:#c2600f;letter-spacing:1px;margin-bottom:4px;">' + esc(order.ref) + '</strong>' +
    new Date().toLocaleString('en-NG') +
  '</td></tr>' +

  // parties
  '<tr><td colspan="2" style="padding:20px 24px;border-bottom:1px solid #e6e3dd;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#3a3730;line-height:1.7;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
      '<td width="50%" valign="top" style="padding-right:12px;">' +
        '<div style="font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:#8a8781;margin-bottom:6px;">Customer</div>' +
        esc(order.name || '-') + '<br>' + esc(order.phone || '') + '<br>' + esc(order.email || '') +
      '</td>' +
      '<td width="50%" valign="top">' +
        '<div style="font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:#8a8781;margin-bottom:6px;">Delivery address</div>' +
        esc(order.address || 'Not given') + (order.state ? '<br>' + esc(order.state) : '') +
      '</td>' +
    '</tr></table>' +
  '</td></tr>' +

  // items
  '<tr><td colspan="2" style="padding:18px 24px 6px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Helvetica,Arial,sans-serif;font-size:13px;">' +
    '<tr><th align="left" style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8a8781;font-weight:normal;padding-bottom:6px;">Item</th>' +
    '<th style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8a8781;font-weight:normal;padding-bottom:6px;">Qty</th>' +
    '<th align="right" style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8a8781;font-weight:normal;padding-bottom:6px;">Price</th>' +
    '<th align="right" style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#8a8781;font-weight:normal;padding-bottom:6px;">Amount</th></tr>' +
    rows +
    '<tr><td colspan="3" align="right" style="padding:8px 0 0;color:#5c5852;font-size:13px;">Subtotal</td><td align="right" style="padding:8px 0 0;color:#1a1a1a;">' + money(order.subtotal || 0) + '</td></tr>' +
    '<tr><td colspan="3" align="right" style="padding:4px 0 0;color:#5c5852;font-size:13px;">Delivery</td><td align="right" style="padding:4px 0 0;color:#1a1a1a;">' + delivery + '</td></tr>' +
    '<tr><td colspan="3" align="right" style="padding:10px 0 0;border-top:1px solid #e6e3dd;color:#111;font-size:15px;font-weight:600;">Total</td>' +
    '<td align="right" style="padding:10px 0 0;border-top:1px solid #e6e3dd;color:#111;font-size:15px;font-weight:600;">' + money(order.total || 0) + '</td></tr>' +
    '</table>' +
  '</td></tr>' +

  // payment
  '<tr><td colspan="2" style="padding:18px 24px 24px;background:#f6f5f2;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#3a3730;line-height:1.7;">' +
    '<div style="font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:#8a8781;margin-bottom:6px;">How to pay</div>' +
    'Transfer <strong>' + money(order.total || 0) + '</strong> to the account on the Ayoola Enterprise website and quote reference <strong>' + esc(order.ref) + '</strong>.<br>' +
    'We will confirm the transfer by email, then pack and deliver.' +
    (CONFIG.WHATSAPP
      ? '<br><br>Questions? WhatsApp +' + CONFIG.WHATSAPP + ' and quote ' + esc(order.ref) + '.'
      : '') +
  '</td></tr>' +

  '</table></td></tr></table></body></html>';
}

function esc(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildOwnerEmail(order) {
  return [
    'NEW ORDER',
    'Reference: ' + order.ref,
    '',
    customerBlock(order),
    '',
    'ITEMS',
    table(order),
    '',
    'Subtotal: ' + money(order.subtotal),
    'Delivery: ' + money(order.delivery),
    'TOTAL:    ' + money(order.total),
    '',
    order.note ? 'Customer note: ' + order.note : '',
    '',
    'Next step: email the customer their account details and confirm the order.'
  ].join('\n');
}

function buildCustomerReceipt(order) {
  var wa = CONFIG.WHATSAPP
    ? '\n\nWhatsApp us on +' + CONFIG.WHATSAPP + ' with your reference ' + order.ref
    : '';

  return [
    'Thank you for your order.',
    '',
    'Reference: ' + order.ref,
    '',
    customerBlock(order),
    '',
    'WHAT YOU ORDERED',
    table(order),
    '',
    'Subtotal: ' + money(order.subtotal),
    'Delivery: ' + money(order.delivery),
    'TOTAL:    ' + money(order.total),
    '',
    'HOW TO PAY',
    'We will send our bank account details separately. Once you transfer, send the ' +
    'reference above and we will confirm and start packing.',
    wa,
    '',
    'Ayoola Enterprise',
    'Wholesale and retail foodstuffs, frozen fish and drinks.'
  ].join('\n');
}

function buildConciergeEmail(order) {
  return [
    'NEW BUDGET REQUEST (we choose the items)',
    'Reference: ' + order.ref,
    '',
    customerBlock(order),
    'Budget:   ' + (order.budget ? money(order.budget) : 'not stated'),
    '',
    'THEIR REQUEST',
    order.request || 'No detail given - just a budget.',
    '',
    order.note ? 'Extra note: ' + order.note : '',
    '',
    'Next step: call them within 24 hours and agree the basket.'
  ].join('\n');
}

function buildConciergeAck(order) {
  return [
    'We have your request.',
    '',
    'Reference: ' + order.ref,
    '',
    'You asked us to choose for you, and we will.',
    'We will call you on ' + (order.phone || 'the number you gave') +
    ' within 24 hours with a basket for your budget.',
    '',
    'Nothing has been charged. You only pay once you are happy with what we put together.',
    '',
    'Ayoola Enterprise'
  ].join('\n');
}

function buildPaymentEmail(order) {
  return [
    'TRANSFER REPORTED BY CUSTOMER',
    'Reference: ' + order.ref,
    '',
    'Name:  ' + (order.name || '-'),
    'Phone: ' + (order.phone || '-'),
    '',
    'The customer says they have already sent money.',
    'Confirm the transfer landed, then pack and arrange delivery.',
    '',
    order.note ? 'Note: ' + order.note : ''
  ].join('\n');
}