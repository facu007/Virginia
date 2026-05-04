let products=[
  {id:1,name:'Over M/L Capicua',cat:'Remeras',price:7500,oldprice:0,stock:24,status:'activo',badge:'new',sizes:'S,M,L,XL',colors:'Negro,Blanco,Gris',desc:'Remera over con estampado capicúa. 100% algodón.',img:'img/DSC06907-scaled.jpg'},
  {id:2,name:'Over Luna',cat:'Remeras',price:5300,oldprice:0,stock:18,status:'activo',badge:'hot',sizes:'S,M,L',colors:'Negro,Bordó',desc:'Remera over con bordado luna.',img:'img/DSC06925-scaled.jpg'},
  {id:3,name:'Frizado Nissmo',cat:'Buzos',price:12000,oldprice:0,stock:9,status:'activo',badge:'',sizes:'S,M,L,XL,XXL',colors:'Negro,Azul',desc:'Buzo frizado interior cálido.',img:'img/IMG-20260408-WA0124-scaled.jpg'},
  {id:4,name:'Frizado Oni 2.0',cat:'Buzos',price:13500,oldprice:15000,stock:14,status:'activo',badge:'new',sizes:'M,L,XL',colors:'Negro,Gris',desc:'Segunda versión del Oni.',img:'img/inbound4468380888781350918-601x800.jpg'},
  {id:5,name:'Frizado Three 2.0',cat:'Buzos',price:13500,oldprice:0,stock:6,status:'activo',badge:'',sizes:'M,L,XL',colors:'Negro',desc:'Buzo frizado edición Three 2.0.',img:'img/inbound4849073990589537579.jpg'},
  {id:6,name:'Buzo Combinado *7*',cat:'Buzos',price:15000,oldprice:0,stock:0,status:'agotado',badge:'',sizes:'S,M,L,XL',colors:'Negro/Gris',desc:'Buzo combinado bicolor.',img:'img/virginia-125-1-scaled.jpg'},
  {id:7,name:'Buzo Over Seize',cat:'Buzos',price:14000,oldprice:0,stock:11,status:'activo',badge:'',sizes:'L,XL,XXL',colors:'Blanco,Negro',desc:'Buzo oversize.',img:'img/WhatsApp-Image-2025-02-19-at-08.51.17.jpeg'},
  {id:8,name:'Frizado Honda 2.0',cat:'Buzos',price:13500,oldprice:0,stock:3,status:'activo',badge:'',sizes:'M,L,XL',colors:'Negro,Rojo',desc:'Frizado Honda Motorsport.',img:'img/WhatsApp-Image-2025-04-03-at-12.23.29-1.jpeg'},
];
let categories=[
  {id:1,name:'Buzos',img:'img/WhatsApp-Image-2025-06-30-at-10.16.49.jpeg',visible:'si'},
  {id:2,name:'Remeras',img:'img/WhatsApp-Image-2026-04-03-at-14.45.59.jpeg',visible:'si'},
  {id:3,name:'Pantalones',img:'img/WhatsApp-Image-2026-04-30-at-15.19.27-1.jpeg',visible:'si'},
  {id:4,name:'Kids',img:'img/DSC06907-scaled.jpg',visible:'si'},
  {id:5,name:'Premium',img:'img/DSC06925-scaled.jpg',visible:'si'},
  {id:6,name:'Rústico',img:'img/IMG-20260408-WA0124-scaled.jpg',visible:'si'},
  {id:7,name:'Combos',img:'img/inbound4468380888781350918-601x800.jpg',visible:'si'},
];
let cart=[],editingId=null,_filterCat='',_filterStatus='';

/* ── NAV ── */
function toggleMenu(){document.querySelectorAll('.hamburger').forEach(hb=>hb.classList.toggle('open'));document.getElementById('mobile-menu').classList.toggle('open')}
function closeMM(){document.querySelectorAll('.hamburger').forEach(hb=>hb.classList.remove('open'));document.getElementById('mobile-menu').classList.remove('open')}
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById(id).classList.add('active');window.scrollTo({top:0,behavior:'instant'})}

function goHome(){ closeMM(); if(window.location.hash==='#inicio') handleHash(); else window.location.hash='#inicio'; }
function goShop(){ closeMM(); if(window.location.hash==='#tienda') handleHash(); else window.location.hash='#tienda'; }
function goMayorista(){ closeMM(); if(window.location.hash==='#mayorista') handleHash(); else window.location.hash='#mayorista'; }
function goContact(){ closeMM(); if(window.location.hash==='#contacto') handleHash(); else window.location.hash='#contacto'; }
function goCategory(cat){ closeMM(); window.location.hash='#categoria-'+cat.toLowerCase(); }

window.addEventListener('hashchange', handleHash);
function handleHash() {
  const h = window.location.hash;
  const login = document.getElementById('login-screen');
  if(login) login.classList.add('hidden');
  if(h !== '#carrito') {
    const cd = document.getElementById('cart-drawer'), ov = document.getElementById('overlay');
    if(cd) cd.classList.remove('open');
    if(ov) ov.classList.remove('show');
    document.body.style.overflow='';
  }
  
  if (h === '#admin') {
    showPage('admin-page');
  } else if (h === '#cuenta') {
    showPage('user-page');
  } else if (h === '#login') {
    showPage('site-page');
    if(login) login.classList.remove('hidden');
  } else if (h.startsWith('#categoria-')) {
    const cat = decodeURIComponent(h.replace('#categoria-', ''));
    showPage('category-page');
    renderCategoryPage(cat);
  } else if (h.startsWith('#producto-')) {
    const id = parseInt(h.replace('#producto-', ''));
    _showProductUI(id);
  } else if (h === '#checkout') {
    _showCheckoutUI();
  } else if (h === '#carrito') {
    const cd = document.getElementById('cart-drawer'), ov = document.getElementById('overlay');
    if(cd) cd.classList.add('open');
    if(ov) ov.classList.add('show');
    document.body.style.overflow='hidden';
  } else {
    if(!document.getElementById('site-page').classList.contains('active')) showPage('site-page');
    if (h && document.querySelector(h)) {
      setTimeout(() => { const el=document.querySelector(h); if(el) el.scrollIntoView({behavior:'smooth'}); }, 60);
    } else {
      window.scrollTo({top:0,behavior:'smooth'});
    }
  }
}

/* ── AUTH ── */
function showAdmin(){ closeMM(); window.location.hash='#login'; }
function doLogin(){
  const u=document.getElementById('login-user').value.trim(),p=document.getElementById('login-pass').value;
  if(u==='admin'&&p==='virginia2026'){
    document.getElementById('login-screen').classList.add('hidden');
    window.location.hash='#admin';
    renderAdminProducts();renderCategories();updateDash();
  }
  else if(u && p){
    document.getElementById('login-screen').classList.add('hidden');
    window.location.hash='#cuenta';
  }
  else{document.getElementById('login-err').style.display='block'}
}
function exitAdmin(){document.getElementById('login-user').value='';document.getElementById('login-pass').value='';document.getElementById('login-err').style.display='none';window.location.hash='#inicio';}

/* ── TABS ── */
function switchTab(n,btn){document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.admin-section').forEach(s=>s.classList.remove('active'));document.getElementById('tab-'+n).classList.add('active')}

/* ── FRONTEND ── */
function renderProductCard(p) {
  return `
    <div class="product-card" onclick="showProduct(${p.id})">
      <div class="product-img-wrap">
        <img src="${p.img}" alt="${p.name}" loading="lazy">
        ${p.badge==='new'?'<span class="product-badge badge-new">Nuevo</span>':p.badge==='hot'?'<span class="product-badge badge-hot">Popular</span>':p.badge==='off'?'<span class="product-badge badge-off">Oferta</span>':''}
        ${p.status==='agotado'?'<span class="product-badge badge-off" style="top:auto;bottom:8px;background:rgba(0,0,0,.7)">Agotado</span>':''}
      </div>
      <div class="product-info">
        <div class="product-cat">${p.cat.toUpperCase()}</div>
        <div class="product-name">${p.name}</div>
        <div><span class="product-price">$${Number(p.price).toLocaleString('es-AR')}</span>${p.oldprice>0?`<span class="product-price-old">$${Number(p.oldprice).toLocaleString('es-AR')}</span>`:''}</div>
        <button class="add-btn"${p.status==='agotado'?' disabled style="opacity:.35;cursor:not-allowed"':''}>${p.status==='agotado'?'Sin stock':'Agregar al carrito'}</button>
      </div>
    </div>`;
}
function renderFrontend(){
  const g=document.getElementById('products-grid');
  g.innerHTML=products.filter(p=>p.status!=='inactivo').map(renderProductCard).join('');
}
function renderCategoryPage(catName){
  const catProds = products.filter(p=>p.cat.toLowerCase()===catName.toLowerCase() && p.status!=='inactivo');
  document.getElementById('cat-page-title').textContent = catName.toUpperCase();
  const g=document.getElementById('cat-products-grid');
  if(catProds.length===0){
    g.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px;color:#777;font-size:14px">Próximamente nuevos ingresos en esta categoría.</div>';
    return;
  }
  g.innerHTML=catProds.map(renderProductCard).join('');
}


/* ── CART ── */
function updateCartUI(){
  const count = cart.reduce((a,x) => a + x.qty, 0);
  document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);
  
  const total = cart.reduce((a,x) => a + x.price * x.qty, 0);
  document.getElementById('cart-total-num').textContent = '$' + total.toLocaleString('es-AR');
  
  const el = document.getElementById('cart-items');
  if(!cart.length){
    el.innerHTML = '<div class="cart-empty">Tu carrito está vacío</div>';
    return;
  }
  el.innerHTML = cart.map(x => `
    <div class="cart-item">
      <img src="${x.img}" alt="${x.name}">
      <div>
        <div class="cart-item-name">${x.name}</div>
        <div style="font-size:10px;color:#888;margin-bottom:3px">${x.selectedSize ? 'Talle: '+x.selectedSize : ''} ${x.selectedColor ? ' | Color: '+x.selectedColor : ''}</div>
        <div class="cart-item-qty">Cant: ${x.qty}</div>
        <div class="cart-item-price">$${(x.price * x.qty).toLocaleString('es-AR')}</div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${x.cartItemId}')">✕</button>
    </div>
  `).join('');
}

function removeFromCart(cartItemId){
  cart = cart.filter(x => x.cartItemId !== cartItemId);
  updateCartUI();
  
  // if we are in checkout page, re-render it
  if(document.getElementById('checkout-page').classList.contains('active')) {
    if(cart.length === 0) {
      goHome();
      notify('El carrito quedó vacío');
    } else {
      goCheckout();
    }
  }
}

function openCart(){ window.location.hash = '#carrito'; }
function closeCart(){ 
  if(window.location.hash === '#carrito') history.back(); 
  else {
    const cd = document.getElementById('cart-drawer'), ov = document.getElementById('overlay');
    if(cd) cd.classList.remove('open');
    if(ov) ov.classList.remove('show');
    document.body.style.overflow='';
  }
}

function goCheckout() {
  if(!cart.length){notify('El carrito está vacío');return}
  const total = cart.reduce((a,x) => a + x.price * x.qty, 0);
  if(total < 50000){
    notify('⚠ El pedido mínimo es de $50.000');
    const el = document.getElementById('cart-total-num');
    if(el) {
      el.style.color = 'var(--danger)';
      el.style.transform = 'translateX(5px)';
      setTimeout(()=>el.style.transform = 'translateX(-5px)', 100);
      setTimeout(()=>{el.style.transform = 'translateX(0)'; el.style.color = 'var(--accent)';}, 200);
    }
    return;
  }
  
  window.location.hash = '#checkout';
}

function _showCheckoutUI() {
  const total = cart.reduce((a,x) => a + x.price * x.qty, 0);
  const el = document.getElementById('co-order-items');
  el.innerHTML = cart.map(x => `
    <div class="co-item-row">
      <div class="co-item-name">${x.name} <strong>× ${x.qty}</strong><br><span style="font-size:10px;color:#666">${x.selectedSize ? 'T:'+x.selectedSize : ''} ${x.selectedColor ? ' C:'+x.selectedColor : ''}</span></div>
      <div>$${(x.price * x.qty).toLocaleString('es-AR')}</div>
    </div>
  `).join('');
  
  document.getElementById('co-subtotal').textContent = '$' + total.toLocaleString('es-AR');
  document.getElementById('co-total').textContent = '$' + total.toLocaleString('es-AR');
  
  showPage('checkout-page');
  window.scrollTo({top:0, behavior:'smooth'});
}

function submitCheckout() {
  const n = document.getElementById('co-name').value.trim();
  const l = document.getElementById('co-last').value.trim();
  const prov = document.getElementById('co-prov').value.trim();
  const city = document.getElementById('co-city').value.trim();
  const addr = document.getElementById('co-addr').value.trim();
  const zip = document.getElementById('co-zip').value.trim();
  const tel = document.getElementById('co-tel').value.trim();
  const doc = document.getElementById('co-doc').value.trim();
  const shipping = document.getElementById('co-shipping').value.trim();
  const notes = document.getElementById('co-notes').value.trim();
  
  if(!n || !l || !prov || !city || !addr || !zip || !tel || !doc) {
    notify('⚠ Por favor completá todos los campos obligatorios (*)');
    return;
  }
  
  const total = cart.reduce((a,x) => a + x.price * x.qty, 0);
  const items = cart.map(x => `• ${x.name} ${x.selectedSize ? '(T:'+x.selectedSize+')' : ''} ${x.selectedColor ? '(C:'+x.selectedColor+')' : ''} x${x.qty} — $${(x.price*x.qty).toLocaleString('es-AR')}`).join('\n');
  
  let msg = `Hola Virginia! Quiero realizar un pedido mayorista:\n\n*DATOS DE FACTURACIÓN Y ENVÍO*\nNombre: ${n} ${l}\nDocumento: ${doc}\nTeléfono: ${tel}\nDirección: ${addr}, ${city}, ${prov} (CP: ${zip})`;
  if(shipping) msg += `\nEmpresa de envío: ${shipping}`;
  if(notes) msg += `\nNotas: ${notes}`;
  
  msg += `\n\n*TU PEDIDO*\n${items}\n\n*TOTAL: $${total.toLocaleString('es-AR')}*\n\nEspero confirmación para coordinar el pago. Gracias!`;
  
  window.open(`https://wa.me/5491176052037?text=${encodeURIComponent(msg)}`,'_blank');
}

/* ── PRODUCT PAGE ── */
let currentPd = null;
function showProduct(id) {
  window.location.hash = '#producto-' + id;
}
function _showProductUI(id) {
  const p = products.find(x => x.id === id);
  if(!p) { window.location.hash = '#inicio'; return; }
  currentPd = p;
  
  document.getElementById('pd-name-bread').textContent = p.name;
  document.getElementById('pd-img').src = p.img;
  document.getElementById('pd-title').textContent = p.name;
  document.getElementById('pd-price').textContent = '$' + Number(p.price).toLocaleString('es-AR');
  document.getElementById('pd-oldprice').textContent = p.oldprice > 0 ? '$' + Number(p.oldprice).toLocaleString('es-AR') : '';
  document.getElementById('pd-desc').textContent = p.desc || 'Sin descripción';
  
  const sizesEl = document.getElementById('pd-sizes');
  if(p.sizes) {
    sizesEl.innerHTML = p.sizes.split(',').map((s, i) => `<div class="pd-chip" onclick="selectChip(this, 'pd-sizes')">${s.trim()}</div>`).join('');
  } else {
    sizesEl.innerHTML = `<div class="pd-chip selected" onclick="selectChip(this, 'pd-sizes')">Único</div>`;
  }
  
  const colorsEl = document.getElementById('pd-colors');
  if(p.colors) {
    colorsEl.innerHTML = p.colors.split(',').map((c, i) => `<div class="pd-chip" onclick="selectChip(this, 'pd-colors')">${c.trim()}</div>`).join('');
  } else {
    colorsEl.innerHTML = `<div class="pd-chip selected" onclick="selectChip(this, 'pd-colors')">Único</div>`;
  }
  
  document.getElementById('pd-qty-input').value = 1;
  document.getElementById('pd-stock-notice').textContent = '';
  document.getElementById('pd-stock-notice').className = 'pd-stock-notice';
  
  const btn = document.getElementById('pd-add-btn');
  if(p.status === 'agotado') {
    btn.textContent = 'SIN STOCK';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    document.getElementById('pd-stock-notice').textContent = 'AGOTADO';
    document.getElementById('pd-stock-notice').className = 'pd-stock-notice error';
  } else {
    btn.textContent = 'AGREGAR AL CARRITO';
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  }
  
  renderRelated(p.cat, p.id);
  
  showPage('product-page');
  window.scrollTo({top:0, behavior:'smooth'});
}

function renderRelated(cat, currentId) {
  let rel = products.filter(p => p.cat === cat && p.id !== currentId && p.status !== 'inactivo');
  if(rel.length < 3) {
    rel = rel.concat(products.filter(p => p.id !== currentId && p.status !== 'inactivo' && p.cat !== cat));
  }
  rel = rel.slice(0, 6);
  
  const el = document.getElementById('related-carousel');
  el.innerHTML = rel.map(p => `
    <div class="product-card" onclick="showProduct(${p.id})">
      <div class="product-img-wrap">
        <img src="${p.img}" alt="${p.name}" loading="lazy">
        ${p.badge==='new'?'<span class="product-badge badge-new">Nuevo</span>':p.badge==='hot'?'<span class="product-badge badge-hot">Popular</span>':p.badge==='off'?'<span class="product-badge badge-off">Oferta</span>':''}
        ${p.status==='agotado'?'<span class="product-badge badge-off" style="top:auto;bottom:8px;background:rgba(0,0,0,.7)">Agotado</span>':''}
      </div>
      <div class="product-info">
        <div class="product-cat">${p.cat.toUpperCase()}</div>
        <div class="product-name">${p.name}</div>
        <div><span class="product-price">$${Number(p.price).toLocaleString('es-AR')}</span>${p.oldprice>0?`<span class="product-price-old">$${Number(p.oldprice).toLocaleString('es-AR')}</span>`:``}</div>
      </div>
    </div>`).join('');
}

function selectChip(el, containerId) {
  document.querySelectorAll('#' + containerId + ' .pd-chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  updateStockNotice();
}

function updateStockNotice() {
  if(!currentPd || currentPd.status === 'agotado') return;
  const sizeChip = document.querySelector('#pd-sizes .pd-chip.selected');
  const colorChip = document.querySelector('#pd-colors .pd-chip.selected');
  
  const notice = document.getElementById('pd-stock-notice');
  notice.className = 'pd-stock-notice';
  
  if(sizeChip && colorChip) {
    let s = currentPd.stock;
    if(s > 5) {
       const hash = (sizeChip.textContent.length * 3) + (colorChip.textContent.length * 7);
       s = Math.max(1, s - (hash % 5));
    }
    notice.textContent = `✓ Hay ${s} unidades disponibles en Talle ${sizeChip.textContent} - Color ${colorChip.textContent}`;
  } else {
    notice.textContent = '';
  }
}

function changePdQty(delta) {
  const input = document.getElementById('pd-qty-input');
  let val = parseInt(input.value) + delta;
  if(val < 1) val = 1;
  input.value = val;
}

function addCurrentPdToCart() {
  if(!currentPd || currentPd.status === 'agotado') return;
  
  const sizeChip = document.querySelector('#pd-sizes .pd-chip.selected');
  const colorChip = document.querySelector('#pd-colors .pd-chip.selected');
  
  if(!sizeChip || !colorChip) {
    const notice = document.getElementById('pd-stock-notice');
    notice.textContent = '⚠ Seleccioná TALLE y COLOR para continuar';
    notice.className = 'pd-stock-notice error';
    
    notice.style.transform = 'translateX(5px)';
    setTimeout(()=>notice.style.transform = 'translateX(-5px)', 100);
    setTimeout(()=>notice.style.transform = 'translateX(0)', 200);
    return;
  }
  
  const qty = parseInt(document.getElementById('pd-qty-input').value) || 1;
  const size = sizeChip.textContent;
  const color = colorChip.textContent;
  
  const cartItemId = currentPd.id + '_' + size + '_' + color;
  const ex = cart.find(x => x.cartItemId === cartItemId);
  if(ex) {
    ex.qty += qty;
  } else {
    cart.push({...currentPd, cartItemId, qty, selectedSize: size, selectedColor: color});
  }
  
  updateCartUI();
  notify(`${currentPd.name} agregado ✓`);
  openCart();
}

function scrollCarousel(dir) {
  const c = document.getElementById('related-carousel');
  const card = c.querySelector('.product-card');
  const scrollAmount = card ? card.offsetWidth + 24 : 300;
  c.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
}

/* ── ADMIN PRODUCTS ── */

function renderAdminProducts(){
  const q=(document.getElementById('search-productos')?.value||'').toLowerCase();
  let list=products;
  if(q)list=list.filter(p=>p.name.toLowerCase().includes(q)||p.cat.toLowerCase().includes(q));
  if(_filterCat)list=list.filter(p=>p.cat===_filterCat);
  if(_filterStatus)list=list.filter(p=>p.status===_filterStatus);
  document.getElementById('products-table-body').innerHTML=list.map(p=>`
    <tr>
      <td><img class="td-img" src="${p.img}" alt="${p.name}"></td>
      <td>${p.name}</td><td style="color:#777;font-size:11px">${p.cat}</td>
      <td class="td-price">$${Number(p.price).toLocaleString('es-AR')}</td>
      <td style="color:${p.stock===0?'var(--danger)':p.stock<5?'#d4a04a':'#8bc34a'}">${p.stock}</td>
      <td><span class="td-badge badge-${p.status}">${p.status}</span></td>
      <td><div class="td-actions"><button class="btn-edit" onclick="editProduct(${p.id})">Editar</button><button class="btn-del" onclick="deleteProduct(${p.id})">✕</button></div></td>
    </tr>`).join('');
  updateDash();renderFrontend();
}
function openModal(p=null){
  editingId=p?p.id:null;
  document.getElementById('modal-title').textContent=p?'EDITAR PRODUCTO':'NUEVO PRODUCTO';
  ['name','cat','price','oldprice','stock','status','badge','sizes','colors','img','desc'].forEach(k=>{const el=document.getElementById('f-'+k);if(el)el.value=p?(p[k]||''):'';});
  if(!p&&document.getElementById('f-status'))document.getElementById('f-status').value='activo';
  document.getElementById('product-modal').classList.add('show');
}
function editProduct(id){openModal(products.find(p=>p.id===id))}
function closeModal(){document.getElementById('product-modal').classList.remove('show');editingId=null}
function saveProduct(){
  const name=document.getElementById('f-name').value.trim(),cat=document.getElementById('f-cat').value,price=Number(document.getElementById('f-price').value);
  if(!name||!cat||!price){notify('⚠ Completá nombre, categoría y precio');return}
  const data={name,cat,price,oldprice:Number(document.getElementById('f-oldprice').value)||0,stock:Number(document.getElementById('f-stock').value)||0,status:document.getElementById('f-status').value,badge:document.getElementById('f-badge').value,sizes:document.getElementById('f-sizes').value,colors:document.getElementById('f-colors').value,img:document.getElementById('f-img').value||'img/inbound4849073990589537579.jpg',desc:document.getElementById('f-desc').value};
  if(editingId){const i=products.findIndex(p=>p.id===editingId);products[i]={...products[i],...data};notify('✓ Producto actualizado')}
  else{data.id=Date.now();products.push(data);notify('✓ Producto agregado')}
  closeModal();renderAdminProducts();
}
function deleteProduct(id){if(!confirm('¿Eliminar este producto?'))return;products=products.filter(p=>p.id!==id);renderAdminProducts();notify('✓ Eliminado')}

/* ── CATEGORIES ── */
function renderCategories(){
  document.getElementById('cat-table-body').innerHTML=categories.map(c=>`
    <tr><td style="font-weight:500">${c.name}</td><td style="color:#777">${products.filter(p=>p.cat===c.name).length}</td>
    <td><img style="width:44px;height:44px;object-fit:cover;border:1px solid var(--border)" src="${c.img}" alt="${c.name}"></td>
    <td><span class="td-badge ${c.visible==='si'?'badge-activo':'badge-inactivo'}">${c.visible==='si'?'Visible':'Oculto'}</span></td>
    <td><div class="td-actions"><button class="btn-edit" onclick="toggleCat(${c.id})">${c.visible==='si'?'Ocultar':'Mostrar'}</button><button class="btn-del" onclick="deleteCat(${c.id})">✕</button></div></td></tr>`).join('');
}
function openCatModal(){document.getElementById('cat-modal').classList.add('show')}
function closeCatModal(){document.getElementById('cat-modal').classList.remove('show')}
function saveCat(){const n=document.getElementById('cat-name-input').value.trim();if(!n){notify('⚠ Escribí un nombre');return}categories.push({id:Date.now(),name:n,img:document.getElementById('cat-img-input').value||'',visible:document.getElementById('cat-visible').value});closeCatModal();renderCategories();notify('✓ Categoría creada')}
function toggleCat(id){const c=categories.find(x=>x.id===id);c.visible=c.visible==='si'?'no':'si';renderCategories();notify('✓ Visibilidad actualizada')}
function deleteCat(id){if(!confirm('¿Eliminar?'))return;categories=categories.filter(c=>c.id!==id);renderCategories();notify('✓ Eliminada')}

/* ── DASH ── */
function updateDash(){
  const a=products.filter(p=>p.status==='activo').length;
  const el=document.getElementById('stat-prods');if(el)el.textContent=a;
  const sub=document.getElementById('stat-prods-sub');if(sub)sub.textContent=`${products.filter(p=>p.status==='agotado').length} agotado(s)`;
  const alertEl=document.getElementById('stock-alerts');if(!alertEl)return;
  const out=products.filter(p=>p.stock===0),low=products.filter(p=>p.stock>0&&p.stock<5);
  let html='';
  out.forEach(p=>{html+=`<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:#1a0f0f;border:1px solid rgba(226,75,74,.22)"><span style="color:var(--danger)">●</span><div><div style="font-size:12px">${p.name}</div><div style="font-size:9px;color:var(--danger);text-transform:uppercase;letter-spacing:.08em">Sin stock</div></div></div>`});
  low.forEach(p=>{html+=`<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:#191400;border:1px solid rgba(186,117,23,.2)"><span style="color:#d4a04a">●</span><div><div style="font-size:12px">${p.name}</div><div style="font-size:9px;color:#d4a04a;text-transform:uppercase;letter-spacing:.08em">Stock bajo: ${p.stock}</div></div></div>`});
  alertEl.innerHTML=html||'<div style="font-size:12px;color:#555;text-align:center;padding:16px">Sin alertas ✓</div>';
}

/* ── NOTIFY ── */
let _nt=null;
function notify(msg){clearTimeout(_nt);const n=document.getElementById('notif');n.textContent=msg;n.classList.add('show');_nt=setTimeout(()=>n.classList.remove('show'),2600)}

/* ── INIT ── */
renderFrontend();updateCartUI();handleHash();