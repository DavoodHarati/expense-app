'use strict';

function invoiceSummary173g(items, transactions, month) {
  const valid = items.filter(item => !item.proforma);
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
  const values = invoiceSummary173g(items, tx, invoiceDate().slice(0,7));
  return '<section class="dashboard-173e"><b>فاکتورها</b><div class="invoice-overview-170" id="invoice-top-summary-173g">' + invoiceSummaryHtml173g(values) + '</div>' + (!items.length ? '<div class="mut">فاکتوری ثبت نشده</div>' : '') + '</section>';
}
function transactionView173g(transaction) {
  if (transaction.ghost || !['debit','credit'].includes(transaction.type)) return null;
  return transaction.type === 'debit' ? {sign:'−', color:'red', label:'برداشت'} : {sign:'+', color:'grn', label:'واریز'};
}
function invoiceCardSummary173g(item, transactions) {
  const state=invoiceStatus170(item,transactions), status=item.payment?.method==='unpaid' && state!=='paid' ? 'نسیه' : item.accounting?.status==='confirmed' ? 'تأییدشده ✓' : 'در انتظار';
  const color=status==='نسیه'?'#b92d61':status.startsWith('تأیید')?'#147345':'#9a6500';
  const linked=transactions.some(t=>!t.ghost && t.type === 'credit' && String(t.invoicePaymentId || '')===String(item.id));
  const lines=(item.lines || []).map(x=>x.name).filter(Boolean).join('، ');
  const assistant=item.assistant ? 'دستیار / همکار: '+item.assistant+' · '+(item.shareMode==='percent' ? String(item.shareValue ?? '')+'٪' : 'مبلغ ثابت')+' · سهم '+(Number(item.share)||0).toLocaleString('fa-IR')+' تومان' : '';
  return '<span class="inv-card-head-173g"><b>'+esc(item.customer || 'بدون نام')+'</b><strong>'+(Number(item.total)||0).toLocaleString('fa-IR')+' تومان</strong></span><span class="mut">'+(linked?'📌 سنجاق‌شده به فاکتور: ':'شماره فاکتور: ')+esc(item.number || '—')+'</span><span class="mut">'+esc(invoiceKind(item))+' · '+esc(item.date || 'تاریخ ثبت نشده')+'</span>'+(lines?'<span class="mut">خدمت / کالا: '+esc(lines)+'</span>':'')+(assistant?'<span class="mut">'+esc(assistant)+'</span>':'')+'<span class="inv-card-bottom-173g"><span style="color:'+color+'">'+status+'</span><button type="button" class="sec invoice-edit" data-id="'+esc(item.id)+'">ویرایش</button></span>';
}
