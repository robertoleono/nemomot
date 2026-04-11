// ============================================================
// NEMOMOT CART SYSTEM
// Integrates with PayPal for payment + redirects to thank-you.html
// ============================================================

// ⚠️  CONFIGURACIÓN — reemplaza con tus datos reales:
// 1. PAYPAL_EMAIL: tu email de cuenta PayPal Business
// 2. RETURN_URL: URL completa de tu thank-you.html (donde vive tu sitio)
// 3. CANCEL_URL: URL a la que vuelve el cliente si cancela el pago
const PAYPAL_CONFIG = {
  email: 'tabosas2011@gmail.com',           // ← reemplaza con tu email PayPal
  returnUrl: 'https://www.nemomot.com/thank-you.html',  // ← URL de tu página de descarga
  cancelUrl: 'https://www.nemomot.com/',       // ← URL si el cliente cancela
  currency: 'USD',
};

const CATALOG = {
  'youre-broke': {
    id: 'youre-broke',
    title: "You're Broke, Not Stupid",
    author: 'Roberto León',
    price: 18.00,
    page: 'youre-broke.html',
  },
  // Agrega futuros libros aquí:
  // 'wired-alone': {
  //   id: 'wired-alone',
  //   title: 'Wired Alone',
  //   author: 'NEMOMOT Editorial',
  //   price: 18.00,
  //   page: 'wired-alone.html',
  // },
};

// ─── CART STATE ──────────────────────────────────────────────
let cart = JSON.parse(localStorage.getItem('nemomot_cart') || '[]');

function saveCart() {
  localStorage.setItem('nemomot_cart', JSON.stringify(cart));
}

function addToCart(productId) {
  const product = CATALOG[productId];
  if (!product) return;
  if (cart.find(i => i.id === productId)) {
    openCart();
    return;
  }
  cart.push({ id: productId });
  saveCart();
  updateCartUI();
  openCart();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCart();
  updateCartUI();
}

function getCartTotal() {
  return cart.reduce((sum, item) => {
    const p = CATALOG[item.id];
    return sum + (p ? p.price : 0);
  }, 0);
}

function getCartItems() {
  return cart.map(i => CATALOG[i.id]).filter(Boolean);
}

// ─── PAYPAL CHECKOUT ────────────────────────────────────────────
// Construye un formulario hacia PayPal con los items del carrito.
// Al completar el pago, PayPal redirige a RETURN_URL (thank-you.html).
function checkout() {
  const items = getCartItems();
  if (items.length === 0) return;

  const form = document.createElement('form');
  form.method = 'post';
  form.action = 'https://www.paypal.com/cgi-bin/webscr';
  form.style.display = 'none';

  // Campos base comunes
  const fields = {
    business:      PAYPAL_CONFIG.email,
    currency_code: PAYPAL_CONFIG.currency,
    return:        PAYPAL_CONFIG.returnUrl,  // ← redirige a thank-you.html tras el pago
    cancel_return: PAYPAL_CONFIG.cancelUrl,  // ← redirige si el cliente cancela
    no_shipping:   '1',  // producto digital, no pedir dirección
    no_note:       '1',
    rm:            '2',  // POST al regresar (más seguro)
  };

  if (items.length === 1) {
    // Pago simple (1 producto)
    fields.cmd       = '_xclick';
    fields.item_name = items[0].title;
    fields.amount    = items[0].price.toFixed(2);
  } else {
    // Carrito con múltiples productos
    fields.cmd    = '_cart';
    fields.upload = '1';
    items.forEach((p, i) => {
      const n = i + 1;
      fields[`item_name_${n}`] = p.title;
      fields[`amount_${n}`]    = p.price.toFixed(2);
      fields[`quantity_${n}`]  = '1';
    });
  }

  // Agregar todos los campos al formulario
  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type  = 'hidden';
    input.name  = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit(); // ← redirige al cliente a PayPal
}

// ─── CART UI ─────────────────────────────────────────────────
function updateCartUI() {
  const count = cart.length;
  const total = getCartTotal();

  // Update all cart badges
  document.querySelectorAll('.cart-badge').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });

  // Update cart drawer
  const drawer = document.getElementById('cartDrawer');
  if (!drawer) return;

  const listEl = drawer.querySelector('.cart-items-list');
  const totalEl = drawer.querySelector('.cart-total-amount');
  const emptyEl = drawer.querySelector('.cart-empty');
  const checkoutBtn = drawer.querySelector('.cart-checkout-btn');

  if (count === 0) {
    if (listEl) listEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    if (checkoutBtn) checkoutBtn.disabled = true;
    if (totalEl) totalEl.textContent = '$0.00';
  } else {
    if (emptyEl) emptyEl.style.display = 'none';
    if (checkoutBtn) checkoutBtn.disabled = false;
    if (totalEl) totalEl.textContent = '$' + total.toFixed(2) + ' USD';
    if (listEl) {
      listEl.innerHTML = getCartItems().map(p => `
        <div class="cart-item">
          <div class="cart-item-info">
            <div class="cart-item-title">${p.title}</div>
            <div class="cart-item-author">${p.author}</div>
          </div>
          <div class="cart-item-right">
            <span class="cart-item-price">$${p.price.toFixed(2)}</span>
            <button class="cart-item-remove" onclick="removeFromCart('${p.id}')" aria-label="Remove">✕</button>
          </div>
        </div>
      `).join('');
    }
  }
}

function openCart() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (drawer) drawer.classList.add('open');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (drawer) drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ─── CART DRAWER HTML ────────────────────────────────────────
function injectCartDrawer() {
  if (document.getElementById('cartDrawer')) return; // already injected

  const overlay = document.createElement('div');
  overlay.id = 'cartOverlay';
  overlay.className = 'cart-overlay';
  overlay.onclick = closeCart;

  const drawer = document.createElement('div');
  drawer.id = 'cartDrawer';
  drawer.className = 'cart-drawer';
  drawer.innerHTML = `
    <div class="cart-header">
      <span class="cart-header-title">Your cart</span>
      <button class="cart-close" onclick="closeCart()">✕</button>
    </div>
    <div class="cart-body">
      <div class="cart-empty">Your cart is empty.</div>
      <div class="cart-items-list"></div>
    </div>
    <div class="cart-footer">
      <div class="cart-total-row">
        <span class="cart-total-label">Total</span>
        <span class="cart-total-amount">$0.00</span>
      </div>
      <button class="cart-checkout-btn" onclick="checkout()" disabled>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        Checkout via PayPal
      </button>
      <p class="cart-secure">🔒 Secure checkout · Instant digital delivery</p>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);
  updateCartUI();
}

// ─── CART STYLES ─────────────────────────────────────────────
function injectCartStyles() {
  if (document.getElementById('nemomot-cart-styles')) return;
  const style = document.createElement('style');
  style.id = 'nemomot-cart-styles';
  style.textContent = `
    /* CART ICON BUTTON */
    .cart-icon-btn {
      position: relative;
      background: none;
      border: .5px solid transparent;
      cursor: pointer;
      padding: 6px 8px;
      display: flex;
      align-items: center;
      gap: .45rem;
      color: var(--ink, #0e0e0e);
      font-family: var(--sans, system-ui);
      font-size: 12px;
      letter-spacing: .05em;
      transition: border-color .2s;
    }
    .cart-icon-btn:hover { border-color: var(--rule, #ddd8ce); }
    .cart-icon-btn svg { display: block; }
    .cart-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      background: var(--gold, #b8924a);
      color: #0c0b08;
      font-size: 9px;
      font-weight: 600;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: none;
      align-items: center;
      justify-content: center;
      font-family: var(--sans, system-ui);
    }
    /* Dark nav variant */
    .nav-dark .cart-icon-btn { color: #c8c4bc; }
    .nav-dark .cart-icon-btn:hover { border-color: var(--rule-dark, #1e1c17); }

    /* OVERLAY */
    .cart-overlay {
      position: fixed; inset: 0;
      background: rgba(13,12,9,.55);
      z-index: 400;
      opacity: 0;
      pointer-events: none;
      transition: opacity .3s;
    }
    .cart-overlay.open { opacity: 1; pointer-events: all; }

    /* DRAWER */
    .cart-drawer {
      position: fixed;
      top: 0; right: 0; bottom: 0;
      width: min(400px, 100vw);
      background: var(--surface, #f7f5f1);
      z-index: 500;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform .35s cubic-bezier(.4,0,.2,1);
      border-left: .5px solid var(--rule, #ddd8ce);
    }
    .cart-drawer.open { transform: translateX(0); }

    .cart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: .5px solid var(--rule, #ddd8ce);
    }
    .cart-header-title {
      font-family: var(--serif, Georgia);
      font-size: 1.05rem;
      font-weight: 400;
      color: var(--ink, #0e0e0e);
    }
    .cart-close {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
      color: var(--ink-muted, #6b6560);
      padding: 4px;
      line-height: 1;
      transition: color .2s;
    }
    .cart-close:hover { color: var(--ink, #0e0e0e); }

    .cart-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem 1.5rem;
    }
    .cart-empty {
      font-size: 13.5px;
      color: var(--ink-muted, #6b6560);
      font-style: italic;
      font-family: var(--serif, Georgia);
      padding: 1rem 0;
    }
    .cart-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1rem 0;
      border-bottom: .5px solid var(--rule, #ddd8ce);
      gap: 1rem;
    }
    .cart-item:first-child { border-top: .5px solid var(--rule, #ddd8ce); }
    .cart-item-title {
      font-family: var(--serif, Georgia);
      font-size: 14.5px;
      color: var(--ink, #0e0e0e);
      margin-bottom: 2px;
    }
    .cart-item-author {
      font-size: 11.5px;
      color: var(--ink-muted, #6b6560);
      letter-spacing: .02em;
    }
    .cart-item-right {
      display: flex;
      align-items: center;
      gap: .75rem;
      flex-shrink: 0;
    }
    .cart-item-price {
      font-size: 13.5px;
      color: var(--ink, #0e0e0e);
      font-variant-numeric: tabular-nums;
    }
    .cart-item-remove {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 11px;
      color: var(--ink-faint, #999);
      padding: 2px;
      transition: color .2s;
      line-height: 1;
    }
    .cart-item-remove:hover { color: var(--ink, #0e0e0e); }

    .cart-footer {
      padding: 1.25rem 1.5rem;
      border-top: .5px solid var(--rule, #ddd8ce);
    }
    .cart-total-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 1rem;
    }
    .cart-total-label {
      font-size: 10.5px;
      letter-spacing: .14em;
      text-transform: uppercase;
      color: var(--ink-muted, #6b6560);
    }
    .cart-total-amount {
      font-family: var(--serif, Georgia);
      font-size: 1.15rem;
      color: var(--ink, #0e0e0e);
    }
    .cart-checkout-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .6rem;
      width: 100%;
      padding: 14px 20px;
      background: var(--gold, #b8924a);
      color: #0c0b08;
      border: none;
      font-size: 11px;
      letter-spacing: .13em;
      text-transform: uppercase;
      font-family: var(--sans, system-ui);
      font-weight: 500;
      cursor: pointer;
      transition: background .2s, opacity .2s;
      margin-bottom: .65rem;
    }
    .cart-checkout-btn:hover:not(:disabled) { background: var(--gold-light, #d4aa6a); }
    .cart-checkout-btn:disabled { opacity: .35; cursor: default; }
    .cart-secure {
      font-size: 10.5px;
      color: var(--ink-faint, #999);
      text-align: center;
      letter-spacing: .03em;
    }

    /* ADD TO CART BTN STATE */
    .btn-added-to-cart {
      background: var(--ink, #0e0e0e) !important;
      color: var(--surface, #f7f5f1) !important;
    }
    .btn-added-to-cart:hover {
      background: var(--ink-soft, #3a3a3a) !important;
      transform: none !important;
    }
  `;
  document.head.appendChild(style);
}

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  injectCartStyles();
  injectCartDrawer();
  updateCartUI();

});
