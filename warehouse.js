// Inventory is derived solely from explicitly marked purchase and sale invoices.
(function (root) {
  'use strict';
  const PURCHASE = 'خرید اجناس انبار', SALE = 'فروش انبار';
  function key(s) { return String(s || '').trim().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' ').toLowerCase(); }
  function report(invoices) {
    const products = new Map();
    for (const invoice of invoices || []) {
      if (invoice.proforma || ![PURCHASE, SALE].includes(invoice.kind)) continue;
      for (const line of invoice.lines || []) {
        const name = String(line.name || '').trim(), id = key(name), qty = Number(line.quantity), price = Number(line.price);
        if (!id || !Number.isSafeInteger(qty) || qty <= 0 || !Number.isSafeInteger(price) || price < 0) throw new Error('اطلاعات یکی از ردیف‌های انبار معتبر نیست.');
        const p = products.get(id) || {name, purchased:0, sold:0, purchaseTotal:0, saleTotal:0};
        if (invoice.kind === PURCHASE) { p.purchased += qty; p.purchaseTotal += qty * price; }
        else { p.sold += qty; p.saleTotal += qty * price; }
        products.set(id, p);
      }
    }
    return [...products.values()].map(p => ({...p, stock:p.purchased-p.sold}));
  }
  function validate(invoices) {
    const products = report(invoices);
    const negative = products.find(p => p.stock < 0);
    if (negative) throw new Error('موجودی «' + negative.name + '» کافی نیست؛ ابتدا خرید را ثبت کن یا تعداد را اصلاح کن.');
    return products;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])); }
  function html(invoices) {
    const p = report(invoices), fa = n => Number(n).toLocaleString('fa-IR');
    return '<section class="card" dir="rtl"><h3>📦 گزارش انبار</h3><p class="mut">موجودی از فاکتورهای خرید و فروش انبار محاسبه می‌شود؛ پیش‌فاکتورها اثری ندارند.</p>' + (p.map(x => '<div style="border-top:1px solid #eee;padding:12px 0"><b>' + esc(x.name) + '</b><div>موجودی: <b>' + fa(x.stock) + '</b> · خرید: ' + fa(x.purchased) + ' · فروش: ' + fa(x.sold) + '</div><small>جمع خرید: ' + fa(x.purchaseTotal) + ' تومان · جمع فروش: ' + fa(x.saleTotal) + ' تومان</small></div>').join('') || '<p>هنوز فاکتور انباری ثبت نشده است.</p>') + '</section>';
  }
  root.warehouse180 = {PURCHASE, SALE, key, report, validate, html};
})(typeof window === 'undefined' ? globalThis : window);
