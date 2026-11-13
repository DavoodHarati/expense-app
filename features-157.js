// محاسبات مستقل برای بودجه و یادآوری؛ مبالغ تراکنش‌ها ریال و سقف‌ها تومان‌اند.
function budgetRows157(categories, budgets, transactions, month) {
  return categories.filter(c => Number.isFinite(Number(budgets[c])) && Number(budgets[c]) > 0).map(category => {
    const limit = Number(budgets[category]);
    const spent = transactions.filter(t => t.type === 'debit' && !t.loan && !t.xfer && !t.ghost && t.cat === category && String(t.date || '').slice(0, 7) === month).reduce((sum, t) => sum + (Number(t.amount) || 0), 0) / 10;
    const ratio = spent / limit;
    return { category, limit, spent, ratio, color: ratio >= 1 ? 'red' : ratio >= .8 ? 'yellow' : 'green' };
  });
}
function dueNotices157(items, shown, today) {
  return items.filter(x => !x.r.done && (x.days === 3 || x.days === 1)).map(x => ({ ...x, key: String(x.r.id) + '|' + x.days + '|' + today })).filter(x => !shown[x.key]);
}
