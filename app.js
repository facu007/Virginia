/* ═══ SUPABASE ═══ */
const SUPABASE_URL='https://fnqqpihplrybawdfwvam.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucXFwaWhwbHJ5YmF3ZGZ3dmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjE5NjEsImV4cCI6MjA5MzQ5Nzk2MX0.VYjxNvQ9RiWM3GB-94rBqdMq17koKh9spcapWCyVnN4';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

let products=[],categories=[];
let cart=[],editingId=null,_filterCat='',_filterStatus='';
let currentUser=null;
let _adminPass=null;

/* ── SESSION PERSISTENCE ── */
function saveSession(){
  if(!currentUser) return;
  sessionStorage.setItem('va_session',JSON.stringify({id:currentUser.id,username:currentUser.username,isAdmin:currentUser.isAdmin,_pw:currentUser._pw,profile:currentUser.profile}));
  if(_adminPass) sessionStorage.setItem('va_admin',_adminPass);
}
function restoreSession(){
  try{
    const s=sessionStorage.getItem('va_session');
    if(!s) return false;
    const d=JSON.parse(s);
    currentUser=d;
    _adminPass=sessionStorage.getItem('va_admin')||null;
    return true;
  }catch(e){return false;}
}
function clearSession(){
  sessionStorage.removeItem('va_session');
  sessionStorage.removeItem('va_admin');
  currentUser=null;_adminPass=null;
}
function updateNavAuth(){
  document.querySelectorAll('.nav-btn').forEach(btn=>{
    if(currentUser){
      btn.textContent=currentUser.isAdmin?'Admin':'Mi cuenta';
      btn.onclick=()=>{closeMM();window.location.hash=currentUser.isAdmin?'#admin':'#cuenta';};
    } else {
      btn.textContent='Iniciar sesión';
      btn.onclick=()=>showAdmin();
    }
  });
  const mmAdmin=document.querySelector('.mm-admin');
  if(mmAdmin){
    if(currentUser){
      mmAdmin.textContent=currentUser.isAdmin?'⚙ Panel Admin':'👤 Mi cuenta';
      mmAdmin.onclick=()=>{closeMM();window.location.hash=currentUser.isAdmin?'#admin':'#cuenta';};
    } else {
      mmAdmin.textContent='🔐 Iniciar sesión';
      mmAdmin.onclick=()=>showAdmin();
    }
  }
}

/* Helper: map Supabase product row to local format */
function mapProduct(r){return{id:r.id,name:r.name,cat:r.cat,price:Number(r.price),oldprice:Number(r.oldprice||0),stock:r.stock||0,status:r.status||'activo',badge:r.badge||'',sizes:r.sizes||'',colors:r.colors||'',desc:r.description||'',img:r.img||''}}
function mapCategory(r){return{id:r.id,name:r.name,img:r.img||'',visible:r.visible||'si'}}

async function loadProducts(){
  const{data,error}=await sb.from('products').select('*').order('id');
  if(!error&&data)products=data.map(mapProduct);
}
async function loadCategories(){
  const{data,error}=await sb.from('categories').select('*').order('id');
  if(!error&&data)categories=data.map(mapCategory);
}

/* ── NAV ── */
function toggleMenu(){
  document.querySelectorAll('.hamburger').forEach(hb=>hb.classList.toggle('open'));
  const mm=document.getElementById('mobile-menu');
  const nav=document.querySelector('.page.active nav')||document.querySelector('nav');
  if(nav) mm.style.top=nav.getBoundingClientRect().bottom+'px';
  mm.classList.toggle('open');
}
function closeMM(){document.querySelectorAll('.hamburger').forEach(hb=>hb.classList.remove('open'));document.getElementById('mobile-menu').classList.remove('open')}
window.addEventListener('scroll',closeMM,{passive:true});
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById(id).classList.add('active');window.scrollTo({top:0,behavior:'instant'})}

function goHome(){ closeMM(); if(window.location.hash==='#inicio') handleHash(); else window.location.hash='#inicio'; }
function goShop(){ closeMM(); if(window.location.hash==='#tienda') handleHash(); else window.location.hash='#tienda'; }
function goMayorista(){ closeMM(); if(window.location.hash==='#info-mayorista') handleHash(); else window.location.hash='#info-mayorista'; }
function goContact(){ closeMM(); if(window.location.hash==='#contacto-page') handleHash(); else window.location.hash='#contacto-page'; }
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
    renderUserProfile();
  } else if (h === '#login') {
    if(currentUser){
      window.location.hash=currentUser.isAdmin?'#admin':'#cuenta';
      return;
    }
    showPage('site-page');
    if(login) login.classList.remove('hidden');
  } else if (h === '#info-mayorista') {
    showPage('mayorista-page');
  } else if (h === '#contacto-page') {
    showPage('contact-page');
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
function showAdmin(){ closeMM(); if(currentUser){window.location.hash=currentUser.isAdmin?'#admin':'#cuenta';} else {window.location.hash='#login';} }
async function doLogin(){
  const u=document.getElementById('login-user').value.trim(),p=document.getElementById('login-pass').value;
  if(!u||!p){document.getElementById('login-err').style.display='block';return;}
  
  // Login seguro via RPC (password se verifica en el servidor)
  const{data,error}=await sb.rpc('login_user',{p_username:u,p_password:p});
  
  if(error){notify('⚠ Error de conexión');return;}
  
  if(data && data.ok){
    currentUser={id:data.id,username:data.username,isAdmin:data.is_admin,profile:{name:data.name||'',last:data.last_name||'',prov:data.prov||'',city:data.city||'',addr:data.addr||'',zip:data.zip||'',tel:data.tel||'',doc:data.doc||'',shipping:data.shipping||'',email:data.email||''}};
    currentUser._pw=p; // password in memory for profile updates
    if(data.is_admin) _adminPass=p;
    saveSession();
    updateNavAuth();
    document.getElementById('login-screen').classList.add('hidden');
    if(data.is_admin){window.location.hash='#admin';renderAdminProducts();renderCategories();updateDash();}
    else{window.location.hash='#cuenta';notify('✓ Bienvenido, '+u);}
  } else if(data && data.reason==='not_found'){
    // Registrar nuevo usuario via RPC
    const{data:reg}=await sb.rpc('register_user',{p_username:u,p_password:p});
    if(reg && reg.ok){
      currentUser={id:reg.id,username:reg.username,isAdmin:false,profile:{},_pw:p};
      saveSession();
      updateNavAuth();
      document.getElementById('login-screen').classList.add('hidden');
      window.location.hash='#cuenta';
      notify('✓ Cuenta creada. Bienvenido, '+u);
    } else {
      notify('⚠ Error al crear cuenta');
    }
  } else {
    document.getElementById('login-err').style.display='block';
  }
}
function exitAdmin(){document.getElementById('login-user').value='';document.getElementById('login-pass').value='';document.getElementById('login-err').style.display='none';clearSession();updateNavAuth();window.location.hash='#inicio';}

/* ── TABS ── */
function switchTab(n,btn){document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.admin-section').forEach(s=>s.classList.remove('active'));document.getElementById('tab-'+n).classList.add('active')}

/* ── USER PANEL ── */
function switchUserTab(n,btn){
  document.querySelectorAll('#user-page .admin-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#user-page .admin-section').forEach(s=>s.classList.remove('active'));
  document.getElementById('utab-'+n).classList.add('active');
  if(n==='pedidos') loadUserOrders();
}

function renderUserProfile(){
  if(!currentUser) return;
  const p=currentUser.profile||{};
  document.getElementById('up-username').textContent=currentUser.username;
  document.getElementById('up-name').value=p.name||'';
  document.getElementById('up-last').value=p.last||'';
  document.getElementById('up-email').value=p.email||'';
  document.getElementById('up-tel').value=p.tel||'';
  document.getElementById('up-doc').value=p.doc||'';
  document.getElementById('up-prov').value=p.prov||'';
  document.getElementById('up-city').value=p.city||'';
  document.getElementById('up-zip').value=p.zip||'';
  document.getElementById('up-addr').value=p.addr||'';
  document.getElementById('up-shipping').value=p.shipping||'';
}

async function saveUserProfile(){
  if(!currentUser||!currentUser._pw){notify('⚠ Sesión no válida');return;}
  const data={
    p_user_id:currentUser.id, p_password:currentUser._pw,
    p_name:document.getElementById('up-name').value.trim(),
    p_last_name:document.getElementById('up-last').value.trim(),
    p_email:document.getElementById('up-email').value.trim(),
    p_tel:document.getElementById('up-tel').value.trim(),
    p_doc:document.getElementById('up-doc').value.trim(),
    p_prov:document.getElementById('up-prov').value.trim(),
    p_city:document.getElementById('up-city').value.trim(),
    p_zip:document.getElementById('up-zip').value.trim(),
    p_addr:document.getElementById('up-addr').value.trim(),
    p_shipping:document.getElementById('up-shipping').value.trim()
  };
  const{data:res}=await sb.rpc('update_profile',data);
  if(res&&res.ok){
    currentUser.profile={name:data.p_name,last:data.p_last_name,email:data.p_email,tel:data.p_tel,doc:data.p_doc,prov:data.p_prov,city:data.p_city,zip:data.p_zip,addr:data.p_addr,shipping:data.p_shipping};
    notify('✓ Datos guardados correctamente');
  } else {
    notify('⚠ Error al guardar');
  }
}

async function loadUserOrders(){
  if(!currentUser||!currentUser._pw) return;
  const el=document.getElementById('user-orders-list');
  el.innerHTML='<div style="text-align:center;color:#555;padding:30px;font-size:13px">Cargando...</div>';
  const{data}=await sb.rpc('get_my_orders',{p_user_id:currentUser.id,p_password:currentUser._pw});
  if(!data||!data.ok||!data.orders||data.orders.length===0){
    el.innerHTML='<div style="text-align:center;color:#555;padding:40px;font-size:13px">Todavía no tenés pedidos.<br><br><button class="btn-primary" onclick="goShop()" style="max-width:200px">Ir a la tienda</button></div>';
    document.getElementById('up-order-count').textContent='0';
    return;
  }
  document.getElementById('up-order-count').textContent=data.orders.length;
  el.innerHTML=data.orders.map(o=>{
    const date=new Date(o.created_at).toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'});
    const statusClass=o.status==='enviado'?'badge-activo':o.status==='pendiente'?'badge-agotado':'badge-inactivo';
    const statusText=o.status.charAt(0).toUpperCase()+o.status.slice(1);
    const items=(o.items||[]).map(i=>`<div style="font-size:11px;color:#888;padding:2px 0">• ${i.name} ${i.size?'(T:'+i.size+')':''} ${i.color?'(C:'+i.color+')':''} ×${i.qty} — $${(i.price*i.qty).toLocaleString('es-AR')}</div>`).join('');
    return `<div style="background:var(--bg);border:1px solid var(--border);padding:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <div>
          <span style="font-family:var(--fd);color:var(--accent);letter-spacing:.08em;font-size:16px">PEDIDO #${o.id}</span>
          <span style="font-size:11px;color:#555;margin-left:12px">${date}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="td-badge ${statusClass}">${statusText}</span>
          <span style="font-family:var(--fd);color:var(--accent);font-size:18px;letter-spacing:.05em">$${Number(o.total).toLocaleString('es-AR')}</span>
        </div>
      </div>
      ${o.shipping_company?'<div style="font-size:11px;color:#666;margin-bottom:8px">🚚 '+o.shipping_company+'</div>':''}
      <div style="border-top:1px solid var(--border);padding-top:10px">${items}</div>
    </div>`;
  }).join('');
}

/* ── FRONTEND ── */
function renderProductCard(p) {
  return `
    <div class="product-card" onclick="showProduct(${p.id})">
      <div class="product-img-wrap">
        <img src="${p.img}" alt="${p.name}" loading="lazy" decoding="async">
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
let _renderTimer=null;
function renderFrontend(){
  clearTimeout(_renderTimer);
  _renderTimer=setTimeout(()=>{
    const g=document.getElementById('products-grid');
    if(!g) return;
    g.innerHTML=products.filter(p=>p.status!=='inactivo').map(renderProductCard).join('');
  },16);
}
function renderCategoryPage(catName){
  document.getElementById('cat-page-title').textContent = catName.toUpperCase();
  const catProds = products.filter(p=>p.cat.toLowerCase()===catName.toLowerCase() && p.status!=='inactivo');
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
  if(total < 150000){
    notify('⚠ El pedido mínimo es de $150.000');
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
  
  // Auto-fill from user profile
  if(currentUser && currentUser.profile) {
    const p = currentUser.profile;
    const fields = {name:'co-name',last:'co-last',prov:'co-prov',city:'co-city',addr:'co-addr',zip:'co-zip',tel:'co-tel',doc:'co-doc',shipping:'co-shipping',email:'co-email'};
    for(const [key, id] of Object.entries(fields)) {
      const input = document.getElementById(id);
      if(input && p[key]) input.value = p[key];
    }
    if(Object.keys(p).length > 0) notify('✓ Datos completados desde tu cuenta');
  }
  
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
  
  const emailVal = document.getElementById('co-email').value.trim();
  
  // Save profile via RPC (password verified server-side)
  if(currentUser && !currentUser.isAdmin && currentUser._pw) {
    currentUser.profile = {name:n, last:l, prov, city, addr, zip, tel, doc, shipping, email:emailVal};
    sb.rpc('update_profile',{p_user_id:currentUser.id,p_password:currentUser._pw,p_name:n,p_last_name:l,p_prov:prov,p_city:city,p_addr:addr,p_zip:zip,p_tel:tel,p_doc:doc,p_shipping:shipping,p_email:emailVal}).then();
  }
  
  // Create account via RPC
  const createAcct = document.getElementById('co-create-account');
  const pw = document.getElementById('co-pw').value;
  if(createAcct && createAcct.checked && pw && !currentUser) {
    const username = emailVal || (n + ' ' + l);
    sb.rpc('register_user',{p_username:username,p_password:pw}).then(({data})=>{
      if(data && data.ok){
        currentUser={id:data.id,username:data.username,isAdmin:false,_pw:pw,profile:{name:n,last:l,prov,city,addr,zip,tel,doc,shipping,email:emailVal}};
        sb.rpc('update_profile',{p_user_id:data.id,p_password:pw,p_name:n,p_last_name:l,p_prov:prov,p_city:city,p_addr:addr,p_zip:zip,p_tel:tel,p_doc:doc,p_shipping:shipping,p_email:emailVal}).then();
        notify('✓ Cuenta creada');
      }
    });
  }
  
  // Save order to Supabase (INSERT allowed by RLS)
  const orderData = {
    user_id: currentUser && !currentUser.isAdmin ? currentUser.id : null,
    items: cart.map(x=>({id:x.id,name:x.name,size:x.selectedSize,color:x.selectedColor,qty:x.qty,price:x.price})),
    total,
    status: 'pendiente',
    customer_name: n+' '+l,
    customer_tel: tel,
    customer_addr: addr,
    customer_prov: prov,
    customer_city: city,
    customer_zip: zip,
    customer_doc: doc,
    customer_email: emailVal,
    shipping_company: shipping,
    notes
  };
  sb.from('orders').insert(orderData).then();
  
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
  if(currentPd) {
    const sizeChip = document.querySelector('#pd-sizes .pd-chip.selected');
    const colorChip = document.querySelector('#pd-colors .pd-chip.selected');
    if(sizeChip && colorChip) {
      let s = currentPd.stock;
      if(s > 5) {
        const hash = (sizeChip.textContent.length * 3) + (colorChip.textContent.length * 7);
        s = Math.max(1, s - (hash % 5));
      }
      const cartItemId = currentPd.id + '_' + sizeChip.textContent + '_' + colorChip.textContent;
      const ex = cart.find(x => x.cartItemId === cartItemId);
      const inCart = ex ? ex.qty : 0;
      if(val > s - inCart) {
        val = Math.max(1, s - inCart);
        const notice = document.getElementById('pd-stock-notice');
        if(s - inCart <= 0) {
          notice.textContent = `⚠ Ya tenés todas las unidades en el carrito (${s})`;
        } else {
          notice.textContent = `⚠ Máximo disponible para agregar: ${s - inCart}`;
        }
        notice.className = 'pd-stock-notice error';
        notice.style.transform = 'translateX(5px)';
        setTimeout(()=>notice.style.transform = 'translateX(-5px)', 100);
        setTimeout(()=>notice.style.transform = 'translateX(0)', 200);
      } else {
        updateStockNotice();
      }
    }
  }
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
  
  let s = currentPd.stock;
  if(s > 5) {
    const hash = (size.length * 3) + (color.length * 7);
    s = Math.max(1, s - (hash % 5));
  }
  
  const cartItemId = currentPd.id + '_' + size + '_' + color;
  const ex = cart.find(x => x.cartItemId === cartItemId);
  const inCart = ex ? ex.qty : 0;
  
  if(qty > s - inCart) {
    const notice = document.getElementById('pd-stock-notice');
    if(s - inCart <= 0) {
      notice.textContent = `⚠ Ya tenés todas las unidades disponibles en el carrito (${s})`;
    } else {
      notice.textContent = `⚠ Solo podés agregar ${s - inCart} unidad(es) más (ya hay ${inCart} en tu carrito)`;
    }
    notice.className = 'pd-stock-notice error';
    notice.style.transform = 'translateX(5px)';
    setTimeout(()=>notice.style.transform = 'translateX(-5px)', 100);
    setTimeout(()=>notice.style.transform = 'translateX(0)', 200);
    return;
  }
  
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
async function saveProduct(){
  if(!_adminPass){notify('⚠ Sesión de admin no válida');return;}
  const name=document.getElementById('f-name').value.trim(),cat=document.getElementById('f-cat').value,price=Number(document.getElementById('f-price').value);
  if(!name||!cat||!price){notify('⚠ Completá nombre, categoría y precio');return}
  const{data,error}=await sb.rpc('admin_save_product',{
    p_admin_pass:_adminPass,
    p_id:editingId||null,
    p_name:name,p_cat:cat,p_price:price,
    p_oldprice:Number(document.getElementById('f-oldprice').value)||0,
    p_stock:Number(document.getElementById('f-stock').value)||0,
    p_status:document.getElementById('f-status').value,
    p_badge:document.getElementById('f-badge').value,
    p_sizes:document.getElementById('f-sizes').value,
    p_colors:document.getElementById('f-colors').value,
    p_img:document.getElementById('f-img').value||'img/inbound4849073990589537579.jpg',
    p_description:document.getElementById('f-desc').value
  });
  if(error||!data||!data.ok){notify('⚠ Error: acceso denegado');return;}
  notify(data.action==='updated'?'✓ Producto actualizado':'✓ Producto agregado');
  await loadProducts();
  closeModal();renderAdminProducts();
}
async function deleteProduct(id){
  if(!_adminPass){notify('⚠ Sesión no válida');return;}
  if(!confirm('¿Eliminar este producto?'))return;
  const{data}=await sb.rpc('admin_delete_product',{p_admin_pass:_adminPass,p_id:id});
  if(!data||!data.ok){notify('⚠ Acceso denegado');return;}
  await loadProducts();renderAdminProducts();notify('✓ Eliminado');
}

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
async function saveCat(){
  if(!_adminPass){notify('⚠ Sesión no válida');return;}
  const n=document.getElementById('cat-name-input').value.trim();
  if(!n){notify('⚠ Escribí un nombre');return}
  const{data}=await sb.rpc('admin_save_category',{p_admin_pass:_adminPass,p_name:n,p_img:document.getElementById('cat-img-input').value||'',p_visible:document.getElementById('cat-visible').value});
  if(!data||!data.ok){notify('⚠ Acceso denegado');return;}
  await loadCategories();closeCatModal();renderCategories();notify('✓ Categoría creada');
}
async function toggleCat(id){
  if(!_adminPass){return;}
  const c=categories.find(x=>x.id===id);const nv=c.visible==='si'?'no':'si';
  await sb.rpc('admin_toggle_category',{p_admin_pass:_adminPass,p_id:id,p_visible:nv});
  await loadCategories();renderCategories();notify('✓ Visibilidad actualizada');
}
async function deleteCat(id){
  if(!_adminPass){return;}
  if(!confirm('¿Eliminar?'))return;
  await sb.rpc('admin_delete_category',{p_admin_pass:_adminPass,p_id:id});
  await loadCategories();renderCategories();notify('✓ Eliminada');
}

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

/* ── CONTACT FORM ── */
function submitContactForm() {
  const name = document.getElementById('cf-name').value.trim();
  const email = document.getElementById('cf-email').value.trim();
  const subject = document.getElementById('cf-subject').value.trim();
  const message = document.getElementById('cf-message').value.trim();
  
  if(!name || !email || !subject) {
    notify('⚠ Por favor completá nombre, email y asunto');
    return;
  }
  
  let msg = `Hola Virginia! Me contacto desde la web:\n\n*Nombre:* ${name}\n*Email:* ${email}\n*Asunto:* ${subject}`;
  if(message) msg += `\n*Mensaje:* ${message}`;
  
  window.open(`https://wa.me/5491176052037?text=${encodeURIComponent(msg)}`, '_blank');
  notify('✓ Redirigiendo a WhatsApp...');
}

/* ── INIT ── */
async function initApp(){
  restoreSession();
  try{
    await Promise.all([loadProducts(),loadCategories()]);
  }catch(e){
    console.warn('Error cargando datos:',e);
  }
  renderFrontend();
  updateCartUI();
  updateNavAuth();
  handleHash();
  // Debounce admin search
  const searchInput=document.getElementById('search-productos');
  if(searchInput){
    let _st=null;
    searchInput.addEventListener('input',()=>{clearTimeout(_st);_st=setTimeout(renderAdminProducts,250);});
  }
}
initApp();