// تشخیص پیامک‌های بانکی. همه مبلغ‌ها ریال هستند.
(function (root) {
  function normalize(t) {
    return String(t)
      .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
      .replace(/\u064A/g, 'ی').replace(/\u0643/g, 'ک')
      .replace(/[\u200e\u200f\u202a-\u202e]/g, '');
  }
  const num = s => parseInt(String(s).replace(/[,،]/g, ''), 10);

  function jalaliNow() {
    const p = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
    const g = t => +p.find(x => x.type === t).value;
    return { y: g('year'), m: g('month'), d: g('day') };
  }
  const pad = n => String(n).padStart(2, '0');

  // قوانین هر بانک. برای افزودن بانک جدید فقط یک قاعده‌ی تازه اضافه کنید.
  const rules = [
    {
      bank: 'ملی',
      test: t => /بانک\s*ملی/.test(t),
      parse(t) {
        const a = t.match(/(برداشت|انتقال|واریز|سپرده|خرید)\s*:\s*([+-]?)\s*([\d,]+)\s*([+-]?)/);
        if (!a) return null;
        const sign = a[2] || a[4];
        const type = sign === '+' ? 'credit' : sign === '-' ? 'debit' : (a[1] === 'برداشت' || a[1] === 'خرید' ? 'debit' : 'credit');
        const acc = (t.match(/حساب\s*:\s*(\d+)/) || [])[1] || '';
        const bal = (t.match(/مانده\s*:\s*([\d,]+)/) || [])[1];
        const d = t.match(/(?<!\d)(\d{2})(\d{2})-(\d{2}:\d{2})/);
        let date = null;
        if (d) {
          const now = jalaliNow();
          let y = now.y; if (+d[1] > now.m) y--;
          date = `${y}/${pad(+d[1])}/${pad(+d[2])} ${d[3]}`;
        }
        return { account: acc, type, amount: num(a[3]), balance: bal ? num(bal) : null, date };
      }
    },
    {
      bank: 'مهر ایران',
      test: t => /^\s*\d{12,}\s*$/m.test(t) && /(?<!\d)\d{4}\/\d{1,2}\/\d{1,2}-\d{1,2}:\d{2}/.test(t),
      parse(t) {
        const acc = t.match(/^\s*(\d{12,})\s*$/m)[1];
        const a = t.match(/^\s*([\d,]+)\s*([+-])\s*$/m);
        if (!a) return null;
        const bal = (t.match(/مانده\s*:\s*([\d,]+)/) || [])[1];
        const d = t.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})-(\d{1,2}:\d{2})/);
        return {
          account: acc, type: a[2] === '+' ? 'credit' : 'debit', amount: num(a[1]),
          balance: bal ? num(bal) : null,
          date: d ? `${d[1]}/${pad(+d[2])}/${pad(+d[3])} ${pad(+d[4].split(':')[0])}:${d[4].split(':')[1]}` : null
        };
      }
    }
  ];

  function parseSms(raw) {
    const t = normalize(raw).trim();
    if (!t) return null;
    if (/رمز|@ib\.|#\d{4,}|ورود/.test(t)) return { ignored: 'otp' };
    for (const r of rules) {
      if (r.test(t)) {
        const res = r.parse(t);
        if (res && res.amount) {
          if (!res.date) { const n = jalaliNow(); res.date = `${n.y}/${pad(n.m)}/${pad(n.d)}`; }
          return { bank: r.bank, ...res, raw: t };
        }
      }
    }
    return null;
  }

  root.parseSms = parseSms;
  if (typeof module !== 'undefined') module.exports = { parseSms };
})(typeof window !== 'undefined' ? window : globalThis);
