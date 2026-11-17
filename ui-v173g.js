'use strict';

function invoiceSummary173g(items, transactions, month) {
  const valid = items.filter(item => !item.proforma && item.kind !== 'inventory_purchase');
  return {
    monthly: valid.filter(item => String(item.date || '').slice(0, 7) === month).reduce((sum, item) => sum + (Number(item.total) || 0), 0),
    debt: valid.filter(item => item.payment?.method === 'unpaid' || invoicePaymentStatus(item, transactions).status === 'partial').reduce((sum, item) => sum + Math.max(0, (Number(item.total) || 0) - invoicePaymentStatus(item, transactions).amount), 0),
    count: valid.length
  };
}
function invoiceSummaryHtml173g(summary) {
  const fmt = n => n.toLocaleString('fa-IR');
  return '<div>جمع ماه<b>' + fmt(summary.monthly) + ' تومان</b></div><div>ماندهٔ طلب<b>' + fmt(summary.debt) + ' تومان</b></div><div>تعداد<b>' + fmt(summary.count) + '</b></div>';
}
function invoiceDashboard173e(items) {
  if (!Array.isArray(items)) return '<div class="card mut" role="status">در حال بارگذاری فاکتورها…</div>';
  items = items.filter(item => !item.proforma);
  const total = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  return '<section class="dashboard-173e"><div class="mut">' + items.length.toLocaleString('fa-IR') + ' فاکتور · جمع کل ' + total.toLocaleString('fa-IR') + ' تومان</div>' + (!items.length ? '<div class="mut">فاکتوری ثبت نشده</div>' : '') + '</section>';
}
function transactionView173g(transaction) {
  if (transaction.ghost || !['debit','credit'].includes(transaction.type)) return null;
  return transaction.type === 'debit' ? {sign:'−', color:'red', label:'برداشت'} : {sign:'+', color:'grn', label:'واریز'};
}
function invoiceCardSummary173g(item, transactions) {
  const status=item.proforma ? INVENTORY_TEXT_FA.proforma : item.accounting?.status==='confirmed' ? '✓ تأییدشده' : '⏳ در انتظار تأیید';
  const color=item.accounting?.status==='confirmed'?'#147345':'#9a6500';
  const payments=transactions.filter(t=>!t.ghost && t.type === 'credit' && String(t.invoicePaymentId || '')===String(item.id));
  const linked=payments.length>0, received=payments.some(t=>!!(t.receipt || t.raw)), paidWithReceipt=received && invoicePaymentStatus(item,transactions).status==='paid';
  const lines=(item.lines || []).map(x=>x.name).filter(Boolean).join('، ');
  const assistant=item.assistant ? 'دستیار / همکار: '+item.assistant+' · '+(item.shareMode==='percent' ? String(item.shareValue ?? '')+'٪' : 'مبلغ ثابت')+' · سهم '+(Number(item.share)||0).toLocaleString('fa-IR')+' تومان' : '';
  return '<span class="inv-card-head-173g" style="width:100%;flex:1 1 100%"><b>▾ '+esc(item.customer || 'بدون نام')+'</b><strong style="color:'+(paidWithReceipt?'#147345':'var(--text, #222)')+'">'+(Number(item.total)||0).toLocaleString('fa-IR')+' تومان</strong></span><span class="mut">'+(linked?'📌 سنجاق‌شده به فاکتور: ':'شماره فاکتور: ')+esc(item.number || '—')+' · '+esc(invoiceKindLabel(item))+' · '+esc(item.date || 'تاریخ ثبت نشده')+'</span>'+(item.payment?.toOwnAccount?'<span class="mut">'+esc(INVENTORY_TEXT_FA.payOwnAccount)+'</span>':'')+(lines?'<span class="mut">خدمت / کالا: '+esc(lines)+'</span>':'')+(assistant?'<span style="color:var(--text, #222)">'+esc(assistant)+'</span>':'')+'<span class="inv-card-bottom-173g" style="width:100%;flex:1 1 100%">'+'<button type="button" class="sec invoice-edit" data-id="'+esc(item.id)+'">ویرایش</button>'+(received?'<span class="mut">🧾 رسید بانکی · '+esc(payments.find(t=>t.receipt || t.raw)?.bank || 'بانک')+'</span>':'')+'<span style="color:'+color+'">'+status+'</span></span>';
}
