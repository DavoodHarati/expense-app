// انبار v181: موجودی از گردش‌ها محاسبه می‌شود؛ کلید ذخیره: wh
(function(){
const K='wh',E=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fa=n=>(Math.round(Number(n)||0)).toLocaleString('fa-IR');
const dg=s=>Number(String(s||'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٬,\s]/g,''))||0;
let q='',gf='',open='',view='stock',per='month';
const db=()=>{let d;try{d=JSON.parse(localStorage.getItem(K));}catch{}return d&&d.items?d:{groups:[],items:[],moves:[]};};
const put=d=>{localStorage.setItem(K,JSON.stringify(d));localStorage.setItem('dirty','1');};
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const today=()=>typeof nowStr==='function'?String(nowStr()).slice(0,10):'';
const stock=(d,id)=>d.moves.filter(m=>m.item===id).reduce((n,m)=>n+m.qty,0);
// ---- فاکتور ----
let L=[];
window.warehouseInvoiceSet=l=>{L=(l||[]).map(x=>({...x}));paint();};
window.warehouseInvoiceGet=()=>L.filter(x=>x.item&&x.qty>0);
window.warehouseInvoiceMaterials=()=>warehouseInvoiceGet().reduce((n,x)=>n+x.qty*x.price,0);
window.warehouseInvoiceCommit=(ref,date)=>{const d=db();d.moves=d.moves.filter(m=>m.ref!==ref);warehouseInvoiceGet().forEach(x=>d.moves.push({id:uid('m'),item:x.item,qty:-x.qty,type:'out',ref,date:date||today(),price:x.buy}));put(d);};
window.warehouseInvoiceRelease=ref=>{const d=db();d.moves=d.moves.filter(m=>m.ref!==ref);put(d);};
window.warehouseInvoiceHtml=()=>'<div id="inv-wh" style="margin:8px 0"></div>';
function paint(){const box=document.getElementById('inv-wh');if(!box)return;const d=db();
  box.innerHTML='<b>📦 لوازم از انبار</b>'+L.map((x,i)=>{const it=d.items.find(v=>v.id===x.item);
    return `<div class="whrow" data-i="${i}" style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0"><select data-f="item" style="flex:2 1 140px"><option value="">کالا...</option>${d.items.map(v=>`<option value="${v.id}" ${v.id===x.item?'selected':''}>${E(v.name)}${v.brand?' · '+E(v.brand):''} (موجودی ${fa(stock(d,v.id))})</option>`).join('')}</select><input data-f="qty" inputmode="numeric" placeholder="تعداد" value="${x.qty||''}" style="flex:1 1 60px"><select data-f="mode" style="flex:1 1 110px"><option value="buy" ${x.mode==='buy'?'selected':''}>قیمت خرید${it?' ('+fa(it.buy)+')':''}</option><option value="sell" ${x.mode==='sell'?'selected':''}>قیمت فروش${it?' ('+fa(it.sell)+')':''}</option><option value="custom" ${x.mode==='custom'?'selected':''}>قیمت دلخواه</option></select><input data-f="price" inputmode="numeric" placeholder="قیمت واحد" value="${x.price||''}" ${x.mode==='custom'?'':'readonly'} style="flex:1 1 90px"><button type="button" class="sec" data-f="rm">✕</button></div>`;}).join('')+'<button type="button" class="sec" id="wh-addl">＋ افزودن کالا از انبار</button><div id="wh-sum" class="mut"></div>';
  sum();}
function sum(){const e=document.getElementById('wh-sum');if(!e)return;const m=warehouseInvoiceMaterials(),c=warehouseInvoiceGet().reduce((n,x)=>n+x.qty*x.buy,0);e.textContent=L.length?`جمع لوازم: ${fa(m)} · هزینهٔ خرید: ${fa(c)} · سود کالا: ${fa(m-c)} تومان`:'';
  const mt=document.getElementById('inv-materials');if(mt&&warehouseInvoiceGet().length){mt.value=m;mt.dispatchEvent(new Event('input',{bubbles:true}));}}
document.addEventListener('click',e=>{if(e.target.id==='wh-addl'){L.push({item:'',qty:1,mode:'sell',price:0,buy:0});paint();}
  const r=e.target.closest('[data-f="rm"]');if(r){L.splice(+r.closest('[data-i]').dataset.i,1);paint();}});
document.addEventListener('change',e=>{const t=e.target,row=t.closest&&t.closest('#inv-wh [data-i]');if(!row)return;const x=L[+row.dataset.i],d=db(),f=t.dataset.f;
  if(f==='item'){const it=d.items.find(v=>v.id===t.value);x.item=t.value;x.buy=it?it.buy:0;x.mode=x.mode||'sell';}
  if(f==='qty'){x.qty=dg(t.value);if(x.item&&x.qty>stock(d,x.item)&&!confirm('تعداد بیشتر از موجودی است. ادامه؟'))x.qty=Math.max(0,stock(d,x.item));}
  if(f==='mode')x.mode=t.value;if(f==='price')x.price=dg(t.value);
  const it=d.items.find(v=>v.id===x.item);if(it&&f!=='price'&&x.mode!=='custom')x.price=x.mode==='buy'?it.buy:it.sell;
  paint();});
// ---- تب انبار ----
const css=`<style>.wh181 .whc{background:#fff;border:1px solid #d9e6e2;border-radius:16px;padding:12px;margin:10px 0}.wh181 .whh{display:flex;justify-content:space-between;align-items:center;gap:8px}.wh181 .whq{font-size:20px;font-weight:800;color:#0f766e}.wh181 .whq.low{color:#c2410c}.wh181 .whq.zero{color:#b91c1c}.wh181 .chips{display:flex;gap:6px;overflow-x:auto;padding:4px 0}.wh181 .chip{white-space:nowrap;border:1px solid #cfe3de;border-radius:20px;padding:6px 12px;background:#f7fbfa;min-height:36px;color:inherit}.wh181 .chip.on{background:#0f766e;color:#fff}.wh181 .whr{display:flex;gap:6px;margin:6px 0;flex-wrap:wrap}.wh181 .whr>*{flex:1 1 100px;min-height:42px}.wh181 .mv{display:flex;justify-content:space-between;font-size:13px;border-top:1px dashed #e5e7eb;padding:5px 0}.wh181 table{width:100%;border-collapse:collapse;font-size:13px}.wh181 td,.wh181 th{padding:6px 4px;border-bottom:1px solid #e5e7eb;text-align:center}.wh181 .pos{color:#0f766e}.wh181 .neg{color:#b91c1c}</style>`;
function wk(date){const [y,m,dd]=String(date).split('/').map(Number);if(!y)return '';const doy=(m<=6?(m-1)*31:186+(m-7)*30)+dd;return y+' · هفته '+fa(Math.ceil(doy/7));}
function report(d){
  const inv=typeof invoiceList==='function'?invoiceList():[];const mp=new Map();
  inv.forEach(i=>{if(i.proforma)return;const key=per==='day'?i.date:per==='week'?wk(i.date):String(i.date||'').slice(0,7);if(!key)return;
    const r=mp.get(key)||{n:0,total:0,profit:0,gm:0,gc:0};const exp=i.kind==='هزینه';r.n++;r.total+=exp?0:Number(i.total)||0;r.profit+=exp?-(Number(i.total)||0):Number(i.accounting?.ownerNet)||0;
    (i.wh||[]).forEach(x=>{r.gc+=x.qty*x.buy;r.gm+=x.qty*(x.price-x.buy);});mp.set(key,r);});
  const rows=[...mp.entries()].sort((a,b)=>a[0]<b[0]?1:-1).slice(0,40);
  const tot=rows.reduce((a,[,r])=>({n:a.n+r.n,total:a.total+r.total,profit:a.profit+r.profit,gm:a.gm+r.gm,gc:a.gc+r.gc}),{n:0,total:0,profit:0,gm:0,gc:0});
  const c=v=>v<0?'neg':'pos';const tr=(k,r)=>`<tr><td>${k}</td><td>${fa(r.n)}</td><td>${fa(r.total)}</td><td>${fa(r.gc)}</td><td class="${c(r.gm)}">${fa(r.gm)}</td><td class="${c(r.profit)}"><b>${fa(r.profit)}</b></td></tr>`;
  const byItem=new Map();inv.forEach(i=>(i.wh||[]).forEach(x=>{const r=byItem.get(x.item)||{q:0,m:0};r.q+=x.qty;r.m+=x.qty*(x.price-x.buy);byItem.set(x.item,r);}));
  return `<div class="chips">${[['day','روزانه'],['week','هفتگی'],['month','ماهانه']].map(([k,t])=>`<button class="chip ${per===k?'on':''}" data-wh="per" data-v="${k}">${t}</button>`).join('')}</div>
  <div class="whc" style="overflow-x:auto"><table><tr><th>دوره</th><th>فاکتور</th><th>فروش</th><th>هزینه کالا</th><th>سود کالا</th><th>سود خالص</th></tr>${rows.map(([k,r])=>tr(k,r)).join('')||'<tr><td colspan=6>فاکتوری نیست</td></tr>'}${rows.length?tr('جمع',tot):''}</table><div class="mut">سود خالص = سهم تو پس از کسر لوازم و سهم دستیار؛ سود کالا = (قیمت انتخابی − قیمت خرید) × تعداد. هفته‌ها از اول فروردین شمرده می‌شوند.</div></div>
  <div class="whc"><b>پرفروش‌ها و سودشان</b>${[...byItem.entries()].sort((a,b)=>b[1].m-a[1].m).slice(0,10).map(([id,r])=>`<div class="mv"><span>${E(d.items.find(i=>i.id===id)?.name||'حذف‌شده')} · ${fa(r.q)} عدد</span><b class="${c(r.m)}">${fa(r.m)}</b></div>`).join('')||'<div class="mut">هنوز کالایی در فاکتور نیست</div>'}</div>`;}
window.warehouseHtml=function(){
  const d=db(),s=q.trim(),items=d.items.filter(i=>(!gf||i.g===gf)&&(!s||(i.name+' '+(i.brand||'')).includes(s)));
  const vb=d.items.reduce((n,i)=>n+Math.max(0,stock(d,i.id))*(i.buy||0),0),vs=d.items.reduce((n,i)=>n+Math.max(0,stock(d,i.id))*(i.sell||0),0);
  const top=`<div class="card noacc"><b>📦 انبار</b><div class="mut">ارزش موجودی: ${fa(vb)} (خرید) · ${fa(vs)} (فروش) · سود بالقوه ${fa(vs-vb)} تومان</div><div class="chips"><button class="chip ${view==='stock'?'on':''}" data-wh="view" data-v="stock">موجودی</button><button class="chip ${view==='report'?'on':''}" data-wh="view" data-v="report">گزارش سود</button></div></div>`;
  if(view==='report')return css+`<div class="wh181">${top}${report(d)}</div>`;
  const card=i=>{const n=stock(d,i.id),g=d.groups.find(x=>x.id===i.g),mv=d.moves.filter(m=>m.item===i.id).slice(-8).reverse();
    return `<div class="whc"><div class="whh"><div><b>${E(i.name)}${i.brand?' · '+E(i.brand):''}</b><br><small class="mut">${E(g?.name||'بدون گروه')} · خرید ${fa(i.buy)} · فروش ${fa(i.sell)} · سود هر عدد ${fa(i.sell-i.buy)}</small></div><div class="whq ${n<=0?'zero':n<=(i.min||0)?'low':''}">${fa(n)}</div></div>
    <div class="whr"><button class="sec" data-wh="buy" data-id="${i.id}">🛒 خرید</button><button class="sec" data-wh="in" data-id="${i.id}">＋ دستی</button><button class="sec" data-wh="out" data-id="${i.id}">－ دستی</button><button class="sec" data-wh="open" data-id="${i.id}">گردش/ویرایش</button></div>
    ${open===i.id?`<div class="whr"><input id="wh-edn" value="${E(i.name)}"><input id="wh-edb" value="${E(i.brand||'')}" placeholder="برند"><input id="wh-edp" inputmode="numeric" value="${i.buy||''}" placeholder="قیمت خرید"><input id="wh-edq" inputmode="numeric" value="${i.sell||''}" placeholder="قیمت فروش"><button data-wh="save" data-id="${i.id}">ذخیره</button><button class="sec" data-wh="del" data-id="${i.id}">حذف کالا</button></div>${mv.map(m=>`<div class="mv"><span>${m.date||''} · ${m.type==='open'?'موجودی اولیه':m.type==='buy'?'خرید'+(m.price?' با '+fa(m.price):''):m.type==='out'?'مصرف در فاکتور '+E(m.ref):m.qty>0?'افزودن دستی':'کسر دستی'}${m.note?' · '+E(m.note):''}</span><b>${m.qty>0?'+':''}${fa(m.qty)}</b></div>`).join('')||'<div class="mut">بدون گردش</div>'}`:''}</div>`;};
  return css+`<div class="wh181">${top}<div class="card noacc"><input id="wh-q" placeholder="جست‌وجوی کالا یا برند" value="${E(q)}"><div class="chips"><button class="chip ${gf?'':'on'}" data-wh="gf" data-v="">همه</button>${d.groups.map(g=>`<button class="chip ${gf===g.id?'on':''}" data-wh="gf" data-v="${g.id}">${E(g.name)}</button>`).join('')}</div>
  <details class="whc"><summary><b>＋ کالای جدید</b></summary><div class="whr"><input id="wh-g" list="wh-gl" placeholder="گروه (مثلاً روغن موتور)"><datalist id="wh-gl">${d.groups.map(g=>`<option value="${E(g.name)}">`).join('')}</datalist><input id="wh-n" placeholder="نام کالا"><input id="wh-b" placeholder="برند"></div><div class="whr"><input id="wh-p" inputmode="numeric" placeholder="قیمت خرید"><input id="wh-r" inputmode="numeric" placeholder="قیمت فروش"><input id="wh-s" inputmode="numeric" placeholder="موجودی اولیه"><input id="wh-m" inputmode="numeric" placeholder="حداقل هشدار"></div><button data-wh="add">ثبت کالا</button></details></div>
  ${items.map(card).join('')||'<div class="whc mut">کالایی نیست. از «کالای جدید» شروع کن.</div>'}</div>`;};
window.warehouseBind=function(){const i=document.getElementById('wh-q');if(i)i.oninput=e=>{q=e.target.value;const p=e.target.selectionStart;render();const n=document.getElementById('wh-q');n.focus();n.setSelectionRange(p,p);};};
document.addEventListener('click',e=>{const b=e.target.closest('[data-wh]');if(!b)return;const a=b.dataset.wh,id=b.dataset.id,d=db(),v=x=>document.getElementById(x)?.value.trim()||'',mv=(qty,type,extra)=>d.moves.push({id:uid('m'),item:id,qty,type,date:today(),...extra});
  if(a==='gf'){gf=b.dataset.v;render();return;}if(a==='view'){view=b.dataset.v;render();return;}if(a==='per'){per=b.dataset.v;render();return;}
  if(a==='open'){open=open===id?'':id;render();return;}
  if(a==='add'){const n=v('wh-n');if(!n){alert('نام کالا را بنویس');return;}const gn=v('wh-g');let g=d.groups.find(x=>x.name===gn);if(gn&&!g){g={id:uid('g'),name:gn};d.groups.push(g);}
    const it={id:uid('i'),g:g?.id||'',name:n,brand:v('wh-b'),buy:dg(v('wh-p')),sell:dg(v('wh-r')),min:dg(v('wh-m'))};d.items.push(it);const s=dg(v('wh-s'));if(s>0)d.moves.push({id:uid('m'),item:it.id,qty:s,type:'open',date:today(),price:it.buy});put(d);render();return;}
  if(a==='buy'){const n=dg(prompt('تعداد خریداری‌شده؟'));if(!n)return;const it=d.items.find(x=>x.id===id),p=dg(prompt('قیمت خرید هر عدد (تومان)؟',it.buy||''));mv(n,'buy',{price:p});if(p)it.buy=p;put(d);render();return;}
  if(a==='in'||a==='out'){const n=dg(prompt(a==='in'?'تعداد افزوده‌شده؟':'تعداد کسرشده؟'));if(!n)return;mv(a==='in'?n:-n,'manual',{note:prompt('توضیح (اختیاری)')||''});put(d);render();return;}
  if(a==='save'){const it=d.items.find(x=>x.id===id);if(it){it.name=v('wh-edn')||it.name;it.brand=v('wh-edb');it.buy=dg(v('wh-edp'));it.sell=dg(v('wh-edq'));put(d);render();}return;}
  if(a==='del'){if(!confirm('کالا و گردش‌هایش حذف شود؟'))return;d.items=d.items.filter(x=>x.id!==id);d.moves=d.moves.filter(m=>m.item!==id);open='';put(d);render();}
});
})();
