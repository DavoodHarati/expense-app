'use strict';

// All reports are projections: neither invoices nor transactions are modified.
function invoiceTopReports191(invoices, transactions, today) {
  const list=Array.isArray(invoices)?invoices:[], txs=Array.isArray(transactions)?transactions:[];
  const rows=list.filter(x=>!x.proforma), financial=rows.filter(x=>x.kind!=='inventory_purchase' && x.accounting?.status==='confirmed');
  const day=text=>{const iso=persianToIso(String(text||'').slice(0,10)); return iso ? Math.floor(Date.parse(iso+'T00:00:00Z')/86400000) : null;};
  const now=day(today || invoiceDate()), months=new Map(), products=new Map(), customers=new Map(), cars=new Map(), stocks=new Map();
  const add=(map,key,value)=>map.set(key,(map.get(key)||0)+value);
  const monthBefore=m=>{const a=/^(\d{4})\/(\d{2})$/.exec(m);if(!a)return '';let y=+a[1], n=+a[2]-1;if(!n){n=12;y--;}return y+'/'+String(n).padStart(2,'0');};
  for (const i of financial) {
    const month=String(i.date||'').slice(0,7); if(/^\d{4}\/\d{2}$/.test(month)){const current=months.get(month)||{month,income:0,expense:0,profit:0}; const r=invoiceReportData([i],txs); for(const key of ['income','expense','profit'])current[key]+=r[key];months.set(month,current);}
    if(invoiceKind(i)!=='\u0647\u0632\u06cc\u0646\u0647') for(const line of i.lines||[]) if(line.name) add(products,String(line.name),Math.max(0,Number(line.quantity)||0)*Math.max(0,Number(line.price)||0));
  }
  const monthly=[...months.values()].sort((a,b)=>b.month.localeCompare(a.month)).map(x=>({...x,previous:months.has(monthBefore(x.month))?x.profit-months.get(monthBefore(x.month)).profit:null}));
  const debtors=rows.filter(i=>invoiceIsUnpaid173k(i,txs)).map(i=>({name:i.customer||'',number:i.number||'',date:i.date||'',amount:Math.max(0,(Number(i.total)||0)-invoicePaymentStatus(i,txs).amount),days:now!==null&&day(i.date)!==null?Math.max(0,now-day(i.date)):null})).sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999')));
  for(const i of rows.filter(i=>i.kind!=='inventory_purchase' && invoiceKind(i)!=='\u0647\u0632\u06cc\u0646\u0647')) { if(i.customer){const c=customers.get(i.customer)||{name:i.customer,paid:0,date:''};c.paid+=invoicePaymentStatus(i,txs).amount;if(String(i.date||'')>c.date)c.date=String(i.date);customers.set(i.customer,c);} if(invoiceHasVehicle190(i.kind||'\u062e\u062f\u0645\u0627\u062a')){const key=String(i.plate||'').trim()||String(i.model||'').trim();if(key){const car=cars.get(key)||{name:key,visits:0,work:new Set()};car.visits++;for(const l of i.lines||[])if(l.name)car.work.add(String(l.name));cars.set(key,car);}} }
  const customerRows=[...customers.values()].map(c=>({...c,absent:now!==null&&day(c.date)!==null&&now-day(c.date)>90})).sort((a,b)=>b.paid-a.paid);
  const checks=rows.filter(i=>i.check).map(i=>({number:i.check.number||'',amount:Number(i.check.amount)||0,date:i.check.date||'',bank:i.check.bank||'',owner:i.check.owner||'',direction:i.check.direction,days:now!==null&&day(i.check.date)!==null?day(i.check.date)-now:null})).sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999')));
  for(const i of rows.filter(i=>i.kind==='inventory_purchase'||i.kind==='inventory_sale')) for(const l of i.lines||[]) {if(!l.name)continue;const key=String(l.name).trim().replace(/\u064a/g,'\u06cc').replace(/\u0643/g,'\u06a9').replace(/\s+/g,' ').toLowerCase(), s=stocks.get(key)||{name:String(l.name).trim(),in:0,out:0,cost:0};const q=Math.max(0,Number(l.quantity)||0);if(i.kind==='inventory_purchase'){s.in+=q;s.cost+=q*Math.max(0,Number(l.price)||0);}else s.out+=q;stocks.set(key,s);}
  const stock=[...stocks.values()].map(s=>({...s,qty:s.in-s.out,value:s.in?s.cost/s.in*(s.in-s.out):null}));
  const pending=list.filter(i=>i.proforma).length, converted=list.filter(i=>!i.proforma&&i.convertedAt).length;
  const deposits={own:0,other:0,count:0};for(const i of rows.filter(i=>i.kind!=='inventory_purchase')){const ps=invoicePaymentStatus(i,txs);if(ps.payments.length){deposits[i.payment?.toOwnAccount?'own':'other']+=ps.amount;deposits.count+=ps.payments.length;}}
  return {monthly,debtors,products:[...products].sort((a,b)=>b[1]-a[1]),customers:customerRows,cars:[...cars.values()].map(c=>({...c,work:[...c.work]})),checks,stock,proformas:{issued:pending+converted,converted,pending},deposits};
}

function invoiceTopReportsBody191(invoices, transactions, today) {
  const r=invoiceTopReports191(invoices,transactions,today), t=INVENTORY_TEXT_FA, money=n=>Number(n||0).toLocaleString('fa-IR')+' '+esc(t.toman), text=x=>esc(String(x??'')), empty='<div class="mut">'+esc(t.topEmpty)+'</div>';
  const section=(title,body)=>'<details class="invoice-account-box"><summary><b>'+esc(title)+'</b></summary>'+(body||empty)+'</details>';
  const monthly=r.monthly.map(x=>'<div>'+text(x.month)+' · '+esc(t.reportIncome)+': '+money(x.income)+' · '+esc(t.reportExpense)+': '+money(x.expense)+' · '+esc(t.reportProfit)+': '+money(x.profit)+' · '+esc(t.topPrevious)+': '+(x.previous===null?esc(t.topNoPrevious):money(x.previous))+'</div>').join('');
  const debt=r.debtors.length?r.debtors.map(x=>'<div>'+text(x.name||x.number)+' · '+text(x.date)+' · '+money(x.amount)+(x.days===null?'':' · '+x.days.toLocaleString('fa-IR')+' '+esc(t.topDelay))+'</div>').join('')+'<b>'+esc(t.topTotalDebt)+': '+money(r.debtors.reduce((n,x)=>n+x.amount,0))+'</b>':'';
  const products=r.products.map(([name,amount])=>'<div>'+text(name)+' · '+money(amount)+'</div>').join('');
  const customers=r.customers.map(x=>'<div>'+text(x.name)+' · '+esc(t.topPaid)+': '+money(x.paid)+' · '+esc(t.topLastVisit)+': '+text(x.date)+(x.absent?' · '+esc(t.topAbsent):'')+'</div>').join('');
  const cars=r.cars.map(x=>'<div>'+text(x.name)+' · '+esc(t.topVisits)+': '+x.visits.toLocaleString('fa-IR')+' · '+text(x.work.join('، '))+'</div>').join('');
  const checks=r.checks.map(x=>'<div>'+esc(x.direction==='paid'?t.checkPaid:t.checkReceived)+' · '+text(x.number)+' · '+money(x.amount)+' · '+text(x.date)+' · '+text(x.bank)+' · '+text(x.owner)+(x.days===null?'':' · '+x.days.toLocaleString('fa-IR')+' '+esc(t.topDueDays))+(x.days!==null&&x.days>=0&&x.days<=7?' · '+esc(t.topDueSoon):'')+'</div>').join('');
  const stock=r.stock.length?r.stock.map(x=>'<div>'+text(x.name)+' · '+esc(t.topStockQty)+': '+x.qty.toLocaleString('fa-IR')+' · '+esc(t.topStockMovement)+': '+x.in.toLocaleString('fa-IR')+' / '+x.out.toLocaleString('fa-IR')+(x.qty<=2?' · '+esc(t.topLowStock):'')+(x.value===null?' · '+esc(t.topStockUnknown):'')+'</div>').join('')+'<b>'+esc(t.topStockValue)+': '+money(r.stock.reduce((n,x)=>n+(x.value||0),0))+'</b>':'';
  const p=r.proformas, proformas=p.issued?'<div>'+esc(t.topIssued)+': '+p.issued.toLocaleString('fa-IR')+' · '+esc(t.topConverted)+': '+p.converted.toLocaleString('fa-IR')+' · '+esc(t.topOpen)+': '+p.pending.toLocaleString('fa-IR')+'</div><small>'+esc(t.topConversionNote)+'</small>':'';
  const deposits=r.deposits.count?'<div>'+esc(t.topOwn)+': '+money(r.deposits.own)+' · '+esc(t.topOthers)+': '+money(r.deposits.other)+'</div><small>'+esc(t.topDepositNote)+'</small>':'';
  return section(t.topMonthly,monthly)+section(t.topDebtors,debt)+section(t.topProducts,products)+section(t.topCustomers,customers)+section(t.topCars,cars)+section(t.topChecks,checks)+section(t.topStock,stock)+section(t.topProformas,proformas)+section(t.topDeposits,deposits);
}
function invoiceTopReportsHtml191() { return '<details id="invoice-top-reports-191" class="card"><summary><b>'+esc(INVENTORY_TEXT_FA.topReports)+'</b></summary><div class="invoice-top-body-191"></div></details>'; }
document.addEventListener('toggle',event=>{if(event.target.id!=='invoice-top-reports-191'||!event.target.open)return;event.target.querySelector('.invoice-top-body-191').innerHTML=invoiceTopReportsBody191(invoiceList(),tx);},true);
