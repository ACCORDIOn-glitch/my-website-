/* ===========================================================
   AYOOLA ENTERPRISE - product catalogue
   ------------------------------------------------------------
   THIS IS THE ONLY FILE YOU NEED TO EDIT TO CHANGE STOCK.

   Prices, pack sizes and photos below are PLACEHOLDERS.
   Replace every price with your real one before going live.
   Drop photos into assets/img/products/ using the `photo`
   filename given for each item, and they appear automatically.

   photo  : file in assets/img/products/ (optional)
   units  : price is per unit; pick sizes with `sizes`
   sizes  : optional. { label, price, was } - `was` is the
            original price if you want to show a discount.
   =========================================================== */

window.AYOOLA = (function () {
  'use strict';

  /* ---------------- SETTINGS ---------------- */
  const CONFIG = {
    // Paste your Google Apps Script web-app URL here.
    // Leave as '' and the site falls back to opening an email draft.
    orderEndpoint: '',

    company: 'Ayoola Enterprise',
    phone: '+234 800 000 0000',        // TODO: real number
    whatsapp: '2348000000000',        // TODO: real number, digits only, no +
    email: 'orders@ayoolaenterprise.com', // TODO: real address

    bank: {
      bank: 'Bank Name',              // TODO
      accountName: 'Ayoola Enterprise', // TODO
      accountNumber: '0000000000',    // TODO
    },

    deliveryFee: 3500,
    freeDeliveryOver: 50000,

    // Show the "prices are placeholders" ribbon on every page.
    // Turn this off once you have entered your real prices.
    showPriceNotice: true,
  };

  /* ---------------- CATEGORIES ---------------- */
  const CATEGORIES = [
    { id: 'foodstuffs', name: 'Foodstuffs', note: 'Rice, beans, yam, semo, amala', photo: 'cat-foodstuffs.jpg' },
    { id: 'frozen',     name: 'Frozen Fish & Poultry', note: 'Tilapia, mackerel, chicken', photo: 'cat-frozen.jpg' },
    { id: 'drinks',     name: 'Drinks', note: 'Crate and bottle sizes', photo: 'cat-drinks.jpg' },
    { id: 'oils',       name: 'Oils & Seasoning', note: 'Palm oil, tomato paste, cubes', photo: 'cat-oils.jpg' },
    { id: 'snacks',     name: 'Snacks & Groceries', note: 'Biscuits, sugar, milk', photo: 'cat-snacks.jpg' },
    { id: 'bundles',    name: 'Wholesale Bundles', note: 'Bulk packs for shops', photo: 'cat-bundles.jpg' },
  ];

  /* ---------------- PRODUCTS ----------------
     id, cat, name, unit, photo, sizes[]  */
  const PRODUCTS = [
    /* --- Foodstuffs --- */
    { id:'rice50', cat:'foodstuffs', name:'Long Grain Rice', unit:'50kg bag', photo:'rice.jpg',
      sizes:[{label:'5kg',price:9500,was:null},{label:'25kg',price:44000,was:null},{label:'50kg',price:85000,was:92000}] },
    { id:'rice10', cat:'foodstuffs', name:'Rice (Small Bag)', unit:'10kg bag', photo:'rice.jpg',
      sizes:[{label:'10kg',price:18500,was:null}] },
    { id:'beans', cat:'foodstuffs', name:'Brown Beans', unit:'5kg bowl', photo:'beans.jpg',
      sizes:[{label:'5kg',price:14500,was:null},{label:'25kg',price:68000,was:null}] },
    { id:'semo', cat:'foodstuffs', name:'Semo (Soya)', unit:'5kg', photo:'semo.jpg',
      sizes:[{label:'5kg',price:12500,was:null},{label:'25kg',price:58000,was:null}] },
    { id:'yam', cat:'foodstuffs', name:'Yam Tubers', unit:'per 10kg', photo:'yam.jpg',
      sizes:[{label:'10kg',price:16000,was:null},{label:'30kg',price:44000,was:null}] },
    { id:'plantain', cat:'foodstuffs', name:'Ripe Plantain', unit:'bunch', photo:'plantain.jpg',
      sizes:[{label:'1 bunch',price:7000,was:null}] },
    { id:'amala', cat:'foodstuffs', name:'Amala Flour', unit:'2kg', photo:'amala.jpg',
      sizes:[{label:'2kg',price:9000,was:null}] },
    { id:'pupuru', cat:'foodstuffs', name:'Pupuru (Pounded Yam)', unit:'per pack', photo:'pupuru.jpg',
      sizes:[{label:'Small',price:4000,was:null},{label:'Large',price:7000,was:null}] },
    { id:'egusi', cat:'foodstuffs', name:'Shelled Egusi', unit:'5kg', photo:'egusi.jpg',
      sizes:[{label:'5kg',price:26000,was:null}] },

    /* --- Frozen --- */
    { id:'ftilapia', cat:'frozen', name:'Frozen Whole Tilapia', unit:'per carton', photo:'tilapia.jpg',
      sizes:[{label:'10kg carton',price:31000,was:null},{label:'25kg carton',price:74000,was:null}] },
    { id:'fmackerel', cat:'frozen', name:'Frozen Mackerel', unit:'per carton', photo:'mackerel.jpg',
      sizes:[{label:'10kg carton',price:46000,was:null}] },
    { id:'fcroaker', cat:'frozen', name:'Frozen Croaker', unit:'per carton', photo:'croaker.jpg',
      sizes:[{label:'10kg carton',price:38000,was:null}] },
    { id:'fshrimp', cat:'frozen', name:'Frozen Shrimp', unit:'per kg', photo:'shrimp.jpg',
      sizes:[{label:'1kg',price:12000,was:null}] },
    { id:'fchicken', cat:'frozen', name:'Frozen Chicken', unit:'per carton', photo:'chicken.jpg',
      sizes:[{label:'10kg carton',price:34000,was:null}] },

    /* --- Drinks --- */
    { id:'coke2l', cat:'drinks', name:'Coca-Cola Family Size', unit:'2L bottle', photo:'coke.jpg',
      sizes:[{label:'1 x 2L',price:1200,was:null},{label:'6 x 2L',price:6900,was:7200},{label:'12 x 2L',price:13200,was:null}] },
    { id:'malt', cat:'drinks', name:'Malt Drinks', unit:'33cl', photo:'malt.jpg',
      sizes:[{label:'6 bottles',price:3900,was:null},{label:'12 bottles',price:7500,was:null},{label:'24 bottles',price:14200,was:null}] },
    { id:'water', cat:'drinks', name:'Table Water', unit:'75cl', photo:'water.jpg',
      sizes:[{label:'12 x 75cl',price:2400,was:null},{label:'24 x 75cl',price:4600,was:null}] },
    { id:'juice', cat:'drinks', name:'Fruit Juice', unit:'1L carton', photo:'juice.jpg',
      sizes:[{label:'6 x 1L',price:9800,was:null},{label:'12 x 1L',price:18500,was:null}] },

    /* --- Oils & seasoning --- */
    { id:'palm', cat:'oils', name:'Palm Oil', unit:'25L keg', photo:'palm.jpg',
      sizes:[{label:'5L',price:9500,was:null},{label:'25L keg',price:42000,was:null}] },
    { id:'tomato', cat:'oils', name:'Tomato Paste', unit:'per carton', photo:'tomato.jpg',
      sizes:[{label:'6 tins',price:11200,was:null}] },
    { id:'cubes', cat:'oils', name:'Seasoning Cubes', unit:'per pack', photo:'cubes.jpg',
      sizes:[{label:'Small',price:2200,was:null},{label:'Large',price:4200,was:null}] },

    /* --- Snacks & groceries --- */
    { id:'sugar', cat:'snacks', name:'Granulated Sugar', unit:'5kg', photo:'sugar.jpg',
      sizes:[{label:'5kg',price:10500,was:null}] },
    { id:'biscuit', cat:'snacks', name:'Biscuits', unit:'per carton', photo:'biscuit.jpg',
      sizes:[{label:'1 carton',price:8600,was:null}] },
    { id:'milk', cat:'snacks', name:'Evaporated Milk', unit:'per carton', photo:'milk.jpg',
      sizes:[{label:'12 tins',price:14500,was:null}] },

    /* --- Wholesale bundles --- */
    { id:'bundle-shop', cat:'bundles', name:'Shop Starter Bundle', unit:'per pack', photo:'bundle1.jpg',
      sizes:[{label:'20 items',price:85000,was:null},{label:'50 items',price:198000,was:215000}] },
    { id:'bundle-family', cat:'bundles', name:'Family Food Bundle', unit:'per pack', photo:'bundle2.jpg',
      sizes:[{label:'Mixed basket',price:52000,was:null},{label:'Double basket',price:99000,was:null}] },
    { id:'bundle-drinks', cat:'bundles', name:'Drinks Wholesale Crate Pack', unit:'per pack', photo:'bundle3.jpg',
      sizes:[{label:'Mixed crates',price:78000,was:null}] },
  ];

  /* ---------------- HELPERS ---------------- */
  const Naira = '\u20A6';
  const money = (n) => Naira + Number(n).toLocaleString('en-NG');

  function discount(p) {
    const s = (p.sizes || []).find(x => x.was);
    if (!s || !s.was || s.was <= s.price) return null;
    return Math.round((1 - s.price / s.was) * 100);
  }
  const from = (p) => Math.min(...(p.sizes || []).map(s => s.price));

  return { CONFIG, CATEGORIES, PRODUCTS, Naira, money, discount, from };
})();