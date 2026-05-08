/* CONFIG */
const SUPABASE_URL = 'https://fnqqpihplrybawdfwvam.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucXFwaWhwbHJ5YmF3ZGZ3dmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjE5NjEsImV4cCI6MjA5MzQ5Nzk2MX0.VYjxNvQ9RiWM3GB-94rBqdMq17koKh9spcapWCyVnN4'
const STORAGE_BUCKET = 'product-images'
const MIN_ORDER_TOTAL = 150000
const SESSION_KEY = 'va_session'
const CART_KEY = 'va_cart'
const APP_CONFIG = window.VIRGINIA_CONFIG || {}
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

let products = []
let categories = []
let orders = []
let cart = []
let editingId = null
let _filterCat = ''
let _filterStatus = ''
let currentUser = null
let currentPd = null
let currentPdImages = []
let currentPdImageIndex = 0
let _renderTimer = null
let _nt = null
let deferredInstallPrompt = null

const shopFilters = {
  search: '',
  category: '',
  price: '',
  size: ''
}

/* HELPERS */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function notify(msg) {
  clearTimeout(_nt)
  const el = document.getElementById('notif')
  if (!el) return
  el.textContent = msg
  el.classList.add('show')
  _nt = setTimeout(() => el.classList.remove('show'), 2600)
}

function formatPrice(value) {
  return '$' + Number(value || 0).toLocaleString('es-AR')
}

function formatDate(value) {
  if (!value) return 'Sin fecha'
  return new Date(value).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function normalizeImageList(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || '').trim()).filter(Boolean)
  }
  if (typeof raw !== 'string') return []
  return raw
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function uniqueList(list) {
  const seen = new Set()
  return list.filter((item) => {
    if (seen.has(item)) return false
    seen.add(item)
    return true
  })
}

function getProductImages(product) {
  const fromImages = Array.isArray(product?.images)
    ? product.images
    : normalizeImageList(product?.images)
  const merged = uniqueList([...fromImages, product?.img].filter(Boolean))
  return merged.length ? merged : ['img/inbound4849073990589537579.jpg']
}

function getPrimaryImage(product) {
  return getProductImages(product)[0]
}

function getStatusBadgeClass(status) {
  if (status === 'enviado' || status === 'activo') return 'badge-activo'
  if (status === 'pendiente' || status === 'agotado') return 'badge-agotado'
  return 'badge-inactivo'
}

function getSessionToken() {
  return currentUser?.sessionToken || null
}

function isSessionValid(data) {
  if (!data || !data.sessionToken) return false
  if (!data.sessionExpiresAt) return true
  return new Date(data.sessionExpiresAt).getTime() > Date.now()
}

function hideLoadingScreen() {
  const el = document.getElementById('loading-screen')
  if (!el) return
  requestAnimationFrame(() => {
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 420)
  })
}

function parsePriceFilter(value) {
  if (!value) return null
  const [minRaw, maxRaw] = value.split('-')
  const min = Number(minRaw)
  const max = Number(maxRaw)
  if (Number.isNaN(min) || Number.isNaN(max)) return null
  return { min, max }
}

function getVisibleProducts() {
  return products.filter((product) => product.status !== 'inactivo')
}

function getVisibleCategories() {
  const categoryMap = new Map()
  categories.forEach((category) => {
    if (!category.name) return
    if (category.visible === 'no') return
    categoryMap.set(category.name, category)
  })
  if (categoryMap.size) return [...categoryMap.values()]

  return uniqueList(products.map((product) => product.cat).filter(Boolean)).map((name) => ({
    name,
    visible: 'si'
  }))
}

function getProductCartCount(productId, excludedCartItemId = null) {
  return cart
    .filter((item) => item.id === productId && item.cartItemId !== excludedCartItemId)
    .reduce((acc, item) => acc + Number(item.qty || 0), 0)
}

function getRemainingStock(product, excludedCartItemId = null) {
  if (!product) return 0
  const reserved = getProductCartCount(product.id, excludedCartItemId)
  return Math.max(Number(product.stock || 0) - reserved, 0)
}

/* SESSION */
function saveSession() {
  if (!currentUser || !currentUser.sessionToken) return
  const sessionData = {
    id: currentUser.id,
    username: currentUser.username,
    isAdmin: currentUser.isAdmin,
    profile: currentUser.profile || {},
    sessionToken: currentUser.sessionToken,
    sessionExpiresAt: currentUser.sessionExpiresAt || null
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
}

function restoreSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return false
    const data = JSON.parse(raw)
    if (!isSessionValid(data)) {
      clearSession()
      return false
    }
    currentUser = data
    return true
  } catch (error) {
    clearSession()
    return false
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
  currentUser = null
}

function updateNavAuth() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    if (currentUser) {
      btn.textContent = currentUser.isAdmin ? 'Admin' : 'Mi cuenta'
      btn.onclick = () => {
        closeMM()
        window.location.hash = currentUser.isAdmin ? '#admin' : '#cuenta'
      }
    } else {
      btn.textContent = 'Iniciar sesion'
      btn.onclick = () => showAdmin()
    }
  })

  const mmAdmin = document.querySelector('.mm-admin')
  if (!mmAdmin) return

  if (currentUser) {
    mmAdmin.textContent = currentUser.isAdmin ? 'Panel admin' : 'Mi cuenta'
    mmAdmin.onclick = () => {
      closeMM()
      window.location.hash = currentUser.isAdmin ? '#admin' : '#cuenta'
    }
  } else {
    mmAdmin.textContent = 'Iniciar sesion'
    mmAdmin.onclick = () => showAdmin()
  }
}

/* CART PERSISTENCE */
function saveCart() {
  const rawCart = cart.map((item) => ({
    id: item.id,
    qty: Number(item.qty || 1),
    cartItemId: item.cartItemId,
    selectedSize: item.selectedSize || '',
    selectedColor: item.selectedColor || ''
  }))
  localStorage.setItem(CART_KEY, JSON.stringify(rawCart))
}

function restoreCart() {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return
    cart = data
      .map((item) => ({
        id: Number(item.id),
        qty: Math.max(1, Number(item.qty || 1)),
        cartItemId: String(item.cartItemId || ''),
        selectedSize: item.selectedSize || '',
        selectedColor: item.selectedColor || ''
      }))
      .filter((item) => item.id && item.cartItemId)
  } catch (error) {
    cart = []
  }
}

function syncCartWithProducts() {
  if (!cart.length) {
    updateCartUI()
    return
  }

  const nextCart = []
  const reservedByProduct = {}

  cart.forEach((item) => {
    const product = products.find((entry) => entry.id === item.id)
    if (!product || product.status === 'inactivo' || Number(product.stock || 0) <= 0) return

    const alreadyReserved = reservedByProduct[product.id] || 0
    const remaining = Math.max(Number(product.stock || 0) - alreadyReserved, 0)
    if (remaining <= 0) return

    const qty = Math.min(Math.max(1, Number(item.qty || 1)), remaining)
    reservedByProduct[product.id] = alreadyReserved + qty

    nextCart.push({
      ...product,
      img: getPrimaryImage(product),
      images: getProductImages(product),
      cartItemId: item.cartItemId,
      selectedSize: item.selectedSize || '',
      selectedColor: item.selectedColor || '',
      qty
    })
  })

  cart = nextCart
  updateCartUI()
}

/* DATA */
function mapProduct(row) {
  const images = getProductImages({ images: row.images, img: row.img })
  return {
    id: Number(row.id),
    name: row.name,
    cat: row.cat,
    price: Number(row.price || 0),
    oldprice: Number(row.oldprice || 0),
    stock: Number(row.stock || 0),
    status: row.status || 'activo',
    badge: row.badge || '',
    sizes: row.sizes || '',
    colors: row.colors || '',
    desc: row.description || '',
    img: images[0],
    images
  }
}

function mapCategory(row) {
  return {
    id: Number(row.id),
    name: row.name,
    img: row.img || '',
    visible: row.visible || 'si'
  }
}

async function loadProducts() {
  const { data, error } = await sb.from('products').select('*').order('id')
  if (error) throw error
  products = (data || []).map(mapProduct)
}

async function loadCategories() {
  const { data, error } = await sb.from('categories').select('*').order('id')
  if (error) throw error
  categories = (data || []).map(mapCategory)
}

async function loadAdminOrders() {
  if (!currentUser?.isAdmin || !getSessionToken()) {
    orders = []
    renderAdminOrders()
    updateDash()
    return
  }

  const { data, error } = await sb.rpc('admin_get_orders', {
    p_session_token: getSessionToken()
  })

  if (error || !data || !data.ok) {
    orders = []
    renderAdminOrders()
    updateDash()
    return
  }

  orders = Array.isArray(data.orders)
    ? data.orders.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    : []

  renderAdminOrders()
  updateDash()
}

/* NAV */
function toggleMenu() {
  document.querySelectorAll('.hamburger').forEach((item) => item.classList.toggle('open'))
  const menu = document.getElementById('mobile-menu')
  if (!menu) return
  const nav = document.querySelector('.page.active nav') || document.querySelector('nav')
  if (nav) menu.style.top = nav.getBoundingClientRect().bottom + 'px'
  menu.classList.toggle('open')
}

function closeMM() {
  document.querySelectorAll('.hamburger').forEach((item) => item.classList.remove('open'))
  const menu = document.getElementById('mobile-menu')
  if (menu) menu.classList.remove('open')
}

window.addEventListener('scroll', closeMM, { passive: true })

function showPage(id) {
  document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'))
  const page = document.getElementById(id)
  if (page) page.classList.add('active')
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}

function goHome() {
  closeMM()
  if (window.location.hash === '#inicio') handleHash()
  else window.location.hash = '#inicio'
}

function goShop() {
  closeMM()
  if (window.location.hash === '#tienda') handleHash()
  else window.location.hash = '#tienda'
}

function goMayorista() {
  closeMM()
  if (window.location.hash === '#info-mayorista') handleHash()
  else window.location.hash = '#info-mayorista'
}

function goContact() {
  closeMM()
  if (window.location.hash === '#contacto-page') handleHash()
  else window.location.hash = '#contacto-page'
}

function goCategory(cat) {
  closeMM()
  window.location.hash = '#categoria-' + String(cat || '').toLowerCase()
}

window.addEventListener('hashchange', handleHash)

function handleHash() {
  const hash = window.location.hash
  const login = document.getElementById('login-screen')
  if (login) login.classList.add('hidden')

  if (hash !== '#carrito') {
    const drawer = document.getElementById('cart-drawer')
    const overlay = document.getElementById('overlay')
    if (drawer) drawer.classList.remove('open')
    if (overlay) overlay.classList.remove('show')
    document.body.style.overflow = ''
  }

  if (hash === '#admin') {
    if (!currentUser?.isAdmin) {
      window.location.hash = '#login'
      return
    }
    showPage('admin-page')
    loadAdminOrders().catch(() => {})
  } else if (hash === '#cuenta') {
    if (!currentUser) {
      window.location.hash = '#login'
      return
    }
    showPage('user-page')
    renderUserProfile()
  } else if (hash === '#login') {
    if (currentUser) {
      window.location.hash = currentUser.isAdmin ? '#admin' : '#cuenta'
      return
    }
    showPage('site-page')
    if (login) login.classList.remove('hidden')
  } else if (hash === '#info-mayorista') {
    showPage('mayorista-page')
  } else if (hash === '#contacto-page') {
    showPage('contact-page')
  } else if (hash.startsWith('#categoria-')) {
    const category = decodeURIComponent(hash.replace('#categoria-', ''))
    showPage('category-page')
    renderCategoryPage(category)
  } else if (hash.startsWith('#producto-')) {
    const id = Number(hash.replace('#producto-', ''))
    _showProductUI(id)
  } else if (hash === '#checkout') {
    _showCheckoutUI()
  } else if (hash === '#carrito') {
    const drawer = document.getElementById('cart-drawer')
    const overlay = document.getElementById('overlay')
    if (drawer) drawer.classList.add('open')
    if (overlay) overlay.classList.add('show')
    document.body.style.overflow = 'hidden'
  } else {
    if (!document.getElementById('site-page')?.classList.contains('active')) showPage('site-page')
    if (hash && document.querySelector(hash)) {
      setTimeout(() => {
        const section = document.querySelector(hash)
        if (section) section.scrollIntoView({ behavior: 'smooth' })
      }, 60)
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
}

/* AUTH */
function showAdmin() {
  closeMM()
  if (currentUser) {
    window.location.hash = currentUser.isAdmin ? '#admin' : '#cuenta'
  } else {
    window.location.hash = '#login'
  }
}

async function doLogin() {
  const username = document.getElementById('login-user').value.trim()
  const password = document.getElementById('login-pass').value
  const errorBox = document.getElementById('login-err')

  if (!username || !password) {
    if (errorBox) errorBox.style.display = 'block'
    return
  }

  const { data, error } = await sb.rpc('login_user', {
    p_username: username,
    p_password: password
  })

  if (error) {
    notify('Error de conexion')
    return
  }

  if (data && data.ok) {
    currentUser = {
      id: data.id,
      username: data.username,
      isAdmin: data.is_admin,
      sessionToken: data.session_token,
      sessionExpiresAt: data.session_expires_at,
      profile: {
        name: data.name || '',
        last: data.last_name || '',
        prov: data.prov || '',
        city: data.city || '',
        addr: data.addr || '',
        zip: data.zip || '',
        tel: data.tel || '',
        doc: data.doc || '',
        shipping: data.shipping || '',
        email: data.email || ''
      }
    }
    saveSession()
    updateNavAuth()
    if (errorBox) errorBox.style.display = 'none'
    if (document.getElementById('login-screen')) document.getElementById('login-screen').classList.add('hidden')

    if (currentUser.isAdmin) {
      window.location.hash = '#admin'
      renderAdminProducts()
      renderCategories()
      loadAdminOrders().catch(() => {})
    } else {
      window.location.hash = '#cuenta'
      notify('Bienvenido, ' + username)
    }
    return
  }

  if (data && data.reason === 'not_found') {
    const { data: reg, error: registerError } = await sb.rpc('register_user', {
      p_username: username,
      p_password: password
    })

    if (registerError || !reg || !reg.ok) {
      notify('Error al crear cuenta')
      return
    }

    currentUser = {
      id: reg.id,
      username: reg.username,
      isAdmin: false,
      sessionToken: reg.session_token,
      sessionExpiresAt: reg.session_expires_at,
      profile: {}
    }
    saveSession()
    updateNavAuth()
    if (document.getElementById('login-screen')) document.getElementById('login-screen').classList.add('hidden')
    window.location.hash = '#cuenta'
    notify('Cuenta creada. Bienvenido, ' + username)
    return
  }

  if (errorBox) errorBox.style.display = 'block'
}

function exitAdmin() {
  const user = document.getElementById('login-user')
  const pass = document.getElementById('login-pass')
  const errorBox = document.getElementById('login-err')
  if (user) user.value = ''
  if (pass) pass.value = ''
  if (errorBox) errorBox.style.display = 'none'
  clearSession()
  updateNavAuth()
  window.location.hash = '#inicio'
}

/* TABS */
function switchTab(name, btn) {
  document.querySelectorAll('.admin-tab').forEach((tab) => tab.classList.remove('active'))
  btn.classList.add('active')
  document.querySelectorAll('.admin-section').forEach((section) => section.classList.remove('active'))
  const target = document.getElementById('tab-' + name)
  if (target) target.classList.add('active')

  if (name === 'pedidos') {
    loadAdminOrders().catch(() => {})
  } else if (name === 'dashboard') {
    updateDash()
  }
}

function switchUserTab(name, btn) {
  document.querySelectorAll('#user-page .admin-tab').forEach((tab) => tab.classList.remove('active'))
  btn.classList.add('active')
  document.querySelectorAll('#user-page .admin-section').forEach((section) => section.classList.remove('active'))
  const target = document.getElementById('utab-' + name)
  if (target) target.classList.add('active')
  if (name === 'pedidos') loadUserOrders()
}

/* USER PANEL */
function renderUserProfile() {
  if (!currentUser) return
  const profile = currentUser.profile || {}
  const usernameEl = document.getElementById('up-username')
  if (usernameEl) usernameEl.textContent = currentUser.username
  const fields = {
    name: 'up-name',
    last: 'up-last',
    email: 'up-email',
    tel: 'up-tel',
    doc: 'up-doc',
    prov: 'up-prov',
    city: 'up-city',
    zip: 'up-zip',
    addr: 'up-addr',
    shipping: 'up-shipping'
  }
  Object.entries(fields).forEach(([key, id]) => {
    const input = document.getElementById(id)
    if (input) input.value = profile[key] || ''
  })
}

async function saveUserProfile() {
  if (!currentUser || !getSessionToken()) {
    notify('Sesion no valida')
    return
  }

  const payload = {
    p_session_token: getSessionToken(),
    p_name: document.getElementById('up-name').value.trim(),
    p_last_name: document.getElementById('up-last').value.trim(),
    p_email: document.getElementById('up-email').value.trim(),
    p_tel: document.getElementById('up-tel').value.trim(),
    p_doc: document.getElementById('up-doc').value.trim(),
    p_prov: document.getElementById('up-prov').value.trim(),
    p_city: document.getElementById('up-city').value.trim(),
    p_zip: document.getElementById('up-zip').value.trim(),
    p_addr: document.getElementById('up-addr').value.trim(),
    p_shipping: document.getElementById('up-shipping').value.trim()
  }

  const { data, error } = await sb.rpc('update_profile', payload)
  if (error || !data || !data.ok) {
    notify('Error al guardar')
    return
  }

  currentUser.profile = {
    name: payload.p_name,
    last: payload.p_last_name,
    email: payload.p_email,
    tel: payload.p_tel,
    doc: payload.p_doc,
    prov: payload.p_prov,
    city: payload.p_city,
    zip: payload.p_zip,
    addr: payload.p_addr,
    shipping: payload.p_shipping
  }
  saveSession()
  notify('Datos guardados correctamente')
}

async function loadUserOrders() {
  const list = document.getElementById('user-orders-list')
  if (!list) return

  if (!currentUser || !getSessionToken()) {
    list.innerHTML = '<div style="text-align:center;color:#555;padding:40px;font-size:13px">Inicia sesion para ver tus pedidos.</div>'
    return
  }

  list.innerHTML = '<div style="text-align:center;color:#555;padding:30px;font-size:13px">Cargando...</div>'
  const { data, error } = await sb.rpc('get_my_orders', {
    p_session_token: getSessionToken()
  })

  if (error || !data || !data.ok || !Array.isArray(data.orders) || data.orders.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:#555;padding:40px;font-size:13px">Todavia no tenes pedidos.<br><br><button class="btn-primary" onclick="goShop()" style="max-width:200px">Ir a la tienda</button></div>'
    const count = document.getElementById('up-order-count')
    if (count) count.textContent = '0'
    return
  }

  const count = document.getElementById('up-order-count')
  if (count) count.textContent = String(data.orders.length)

  list.innerHTML = data.orders
    .map((order) => {
      const items = Array.isArray(order.items)
        ? order.items
            .map((item) => {
              const sizeText = item.size ? ' (T:' + escapeHtml(item.size) + ')' : ''
              const colorText = item.color ? ' (C:' + escapeHtml(item.color) + ')' : ''
              return `<div style="font-size:11px;color:#888;padding:2px 0">• ${escapeHtml(item.name)}${sizeText}${colorText} ×${item.qty} - ${formatPrice(Number(item.price || 0) * Number(item.qty || 0))}</div>`
            })
            .join('')
        : ''
      const status = order.status || 'pendiente'
      const statusText = status.charAt(0).toUpperCase() + status.slice(1)
      return `<div style="background:var(--bg);border:1px solid var(--border);padding:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
          <div>
            <span style="font-family:var(--fd);color:var(--accent);letter-spacing:.08em;font-size:16px">PEDIDO #${order.id}</span>
            <span style="font-size:11px;color:#555;margin-left:12px">${formatDate(order.created_at)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <span class="td-badge ${getStatusBadgeClass(status)}">${escapeHtml(statusText)}</span>
            <span style="font-family:var(--fd);color:var(--accent);font-size:18px;letter-spacing:.05em">${formatPrice(order.total)}</span>
          </div>
        </div>
        ${order.shipping_company ? '<div style="font-size:11px;color:#666;margin-bottom:8px">Transporte: ' + escapeHtml(order.shipping_company) + '</div>' : ''}
        <div style="border-top:1px solid var(--border);padding-top:10px">${items}</div>
      </div>`
    })
    .join('')
}

/* FILTERS + FRONTEND */
function setSelectOptions(select, items, emptyLabel) {
  if (!select) return
  const currentValue = select.value
  select.innerHTML =
    `<option value="">${escapeHtml(emptyLabel)}</option>` +
    items.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('')
  if (items.includes(currentValue)) select.value = currentValue
}

function populateCategoryControls() {
  const visibleCategoryNames = getVisibleCategories().map((category) => category.name)
  const allCategoryNames = uniqueList(categories.map((category) => category.name).filter(Boolean))

  setSelectOptions(document.getElementById('shop-cat-filter'), visibleCategoryNames, 'Todas las categorias')
  setSelectOptions(document.getElementById('admin-cat-filter'), allCategoryNames, 'Todas')

  const productCategorySelect = document.getElementById('f-cat')
  if (productCategorySelect) {
    const currentValue = productCategorySelect.value
    productCategorySelect.innerHTML =
      '<option value="">Seleccionar...</option>' +
      allCategoryNames.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('')
    if (allCategoryNames.includes(currentValue)) productCategorySelect.value = currentValue
  }

  const sizeOptions = uniqueList(
    getVisibleProducts()
      .flatMap((product) => product.sizes.split(','))
      .map((size) => size.trim())
      .filter(Boolean)
  )
  setSelectOptions(document.getElementById('shop-size-filter'), sizeOptions, 'Todos los talles')
}

function filterShop() {
  shopFilters.search = (document.getElementById('shop-search')?.value || '').trim().toLowerCase()
  shopFilters.category = document.getElementById('shop-cat-filter')?.value || ''
  shopFilters.price = document.getElementById('shop-price-filter')?.value || ''
  shopFilters.size = document.getElementById('shop-size-filter')?.value || ''
  renderFrontend()
}

function getFilteredShopProducts() {
  let list = getVisibleProducts()

  if (shopFilters.search) {
    list = list.filter((product) => {
      const haystack = [product.name, product.cat, product.desc, product.colors, product.sizes]
        .join(' ')
        .toLowerCase()
      return haystack.includes(shopFilters.search)
    })
  }

  if (shopFilters.category) {
    list = list.filter((product) => product.cat === shopFilters.category)
  }

  if (shopFilters.price) {
    const range = parsePriceFilter(shopFilters.price)
    if (range) {
      list = list.filter((product) => product.price >= range.min && product.price <= range.max)
    }
  }

  if (shopFilters.size) {
    list = list.filter((product) =>
      product.sizes
        .split(',')
        .map((size) => size.trim())
        .filter(Boolean)
        .includes(shopFilters.size)
    )
  }

  return list
}

function renderProductCard(product) {
  const primaryImage = getPrimaryImage(product)
  return `
    <div class="product-card" onclick="showProduct(${product.id})">
      <div class="product-img-wrap">
        <img src="${escapeHtml(primaryImage)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async">
        ${product.badge === 'new' ? '<span class="product-badge badge-new">Nuevo</span>' : ''}
        ${product.badge === 'hot' ? '<span class="product-badge badge-hot">Popular</span>' : ''}
        ${product.badge === 'off' ? '<span class="product-badge badge-off">Oferta</span>' : ''}
        ${product.status === 'agotado' ? '<span class="product-badge badge-off" style="top:auto;bottom:8px;background:rgba(0,0,0,.7)">Agotado</span>' : ''}
      </div>
      <div class="product-info">
        <div class="product-cat">${escapeHtml(product.cat.toUpperCase())}</div>
        <div class="product-name">${escapeHtml(product.name)}</div>
        <div><span class="product-price">${formatPrice(product.price)}</span>${product.oldprice > 0 ? `<span class="product-price-old">${formatPrice(product.oldprice)}</span>` : ''}</div>
        <button class="add-btn"${product.status === 'agotado' ? ' disabled style="opacity:.35;cursor:not-allowed"' : ''}>${product.status === 'agotado' ? 'Sin stock' : 'Ver detalles'}</button>
      </div>
    </div>`
}

function renderFrontend() {
  clearTimeout(_renderTimer)
  _renderTimer = setTimeout(() => {
    const grid = document.getElementById('products-grid')
    if (!grid) return

    const filteredProducts = getFilteredShopProducts()
    const results = document.getElementById('shop-results-count')
    if (results) {
      results.textContent = filteredProducts.length
        ? `${filteredProducts.length} producto${filteredProducts.length === 1 ? '' : 's'} encontrados`
        : 'No encontramos prendas con esos filtros'
    }

    if (!filteredProducts.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#777;font-size:14px">No hay productos que coincidan con tu busqueda.</div>'
      return
    }

    grid.innerHTML = filteredProducts.map(renderProductCard).join('')
  }, 16)
}

function renderCategoryPage(catName) {
  const title = document.getElementById('cat-page-title')
  if (title) title.textContent = String(catName || '').toUpperCase()
  const categoryProducts = getVisibleProducts().filter(
    (product) => product.cat.toLowerCase() === String(catName || '').toLowerCase()
  )
  const grid = document.getElementById('cat-products-grid')
  if (!grid) return

  if (!categoryProducts.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#777;font-size:14px">Proximamente nuevos ingresos en esta categoria.</div>'
    return
  }

  grid.innerHTML = categoryProducts.map(renderProductCard).join('')
}

/* CART */
function updateCartUI() {
  saveCart()
  const count = cart.reduce((acc, item) => acc + Number(item.qty || 0), 0)
  document.querySelectorAll('.cart-count').forEach((el) => {
    el.textContent = String(count)
  })

  const total = cart.reduce((acc, item) => acc + Number(item.price || 0) * Number(item.qty || 0), 0)
  const totalEl = document.getElementById('cart-total-num')
  if (totalEl) totalEl.textContent = formatPrice(total)

  const list = document.getElementById('cart-items')
  if (!list) return

  if (!cart.length) {
    list.innerHTML = '<div class="cart-empty">Tu carrito esta vacio</div>'
    return
  }

  list.innerHTML = cart
    .map((item) => `
      <div class="cart-item">
        <img src="${escapeHtml(getPrimaryImage(item))}" alt="${escapeHtml(item.name)}">
        <div>
          <div class="cart-item-name">${escapeHtml(item.name)}</div>
          <div style="font-size:10px;color:#888;margin-bottom:3px">${item.selectedSize ? 'Talle: ' + escapeHtml(item.selectedSize) : ''}${item.selectedColor ? ' | Color: ' + escapeHtml(item.selectedColor) : ''}</div>
          <div class="cart-item-qty">Cant: ${item.qty}</div>
          <div class="cart-item-price">${formatPrice(Number(item.price || 0) * Number(item.qty || 0))}</div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart('${escapeHtml(item.cartItemId)}')">×</button>
      </div>`)
    .join('')
}

function removeFromCart(cartItemId) {
  cart = cart.filter((item) => item.cartItemId !== cartItemId)
  updateCartUI()

  const checkoutPage = document.getElementById('checkout-page')
  if (checkoutPage?.classList.contains('active')) {
    if (!cart.length) {
      goHome()
      notify('El carrito quedo vacio')
    } else {
      goCheckout()
    }
  }
}

function openCart() {
  window.location.hash = '#carrito'
}

function closeCart() {
  if (window.location.hash === '#carrito') {
    history.back()
    return
  }
  const drawer = document.getElementById('cart-drawer')
  const overlay = document.getElementById('overlay')
  if (drawer) drawer.classList.remove('open')
  if (overlay) overlay.classList.remove('show')
  document.body.style.overflow = ''
}

function goCheckout() {
  if (!cart.length) {
    notify('El carrito esta vacio')
    return
  }

  const total = cart.reduce((acc, item) => acc + Number(item.price || 0) * Number(item.qty || 0), 0)
  if (total < MIN_ORDER_TOTAL) {
    notify('El pedido minimo es de ' + formatPrice(MIN_ORDER_TOTAL))
    const el = document.getElementById('cart-total-num')
    if (el) {
      el.style.color = 'var(--danger)'
      el.style.transform = 'translateX(5px)'
      setTimeout(() => {
        el.style.transform = 'translateX(-5px)'
      }, 100)
      setTimeout(() => {
        el.style.transform = 'translateX(0)'
        el.style.color = 'var(--accent)'
      }, 200)
    }
    return
  }

  window.location.hash = '#checkout'
}

function _showCheckoutUI() {
  if (!cart.length) {
    goHome()
    return
  }

  const total = cart.reduce((acc, item) => acc + Number(item.price || 0) * Number(item.qty || 0), 0)
  const itemsEl = document.getElementById('co-order-items')
  if (itemsEl) {
    itemsEl.innerHTML = cart
      .map((item) => `
        <div class="co-item-row">
          <div class="co-item-name">${escapeHtml(item.name)} <strong>× ${item.qty}</strong><br><span style="font-size:10px;color:#666">${item.selectedSize ? 'T:' + escapeHtml(item.selectedSize) : ''} ${item.selectedColor ? ' C:' + escapeHtml(item.selectedColor) : ''}</span></div>
          <div>${formatPrice(Number(item.price || 0) * Number(item.qty || 0))}</div>
        </div>`)
      .join('')
  }

  const subtotal = document.getElementById('co-subtotal')
  const grandTotal = document.getElementById('co-total')
  if (subtotal) subtotal.textContent = formatPrice(total)
  if (grandTotal) grandTotal.textContent = formatPrice(total)

  if (currentUser?.profile) {
    const fields = {
      name: 'co-name',
      last: 'co-last',
      prov: 'co-prov',
      city: 'co-city',
      addr: 'co-addr',
      zip: 'co-zip',
      tel: 'co-tel',
      doc: 'co-doc',
      shipping: 'co-shipping',
      email: 'co-email'
    }
    Object.entries(fields).forEach(([key, id]) => {
      const input = document.getElementById(id)
      if (input && currentUser.profile[key]) input.value = currentUser.profile[key]
    })
  }

  showPage('checkout-page')
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function setCheckoutSubmitting(isSubmitting) {
  const btn = document.querySelector('.co-btn')
  if (!btn) return
  btn.disabled = isSubmitting
  btn.style.opacity = isSubmitting ? '0.7' : '1'
  btn.textContent = isSubmitting ? 'PROCESANDO...' : 'CONFIRMAR Y ENVIAR POR WHATSAPP'
}

function buildOrderItemsPayload() {
  return cart.map((item) => ({
    id: item.id,
    name: item.name,
    size: item.selectedSize || '',
    color: item.selectedColor || '',
    qty: Number(item.qty || 1),
    price: Number(item.price || 0)
  }))
}

function buildWhatsAppMessage(orderId, checkoutData, items, total) {
  const orderNumber = orderId ? `#${orderId}` : 'sin numero'
  const lines = items
    .map((item) => {
      const sizeText = item.size ? ` (T:${item.size})` : ''
      const colorText = item.color ? ` (C:${item.color})` : ''
      return `• ${item.name}${sizeText}${colorText} x${item.qty} - ${formatPrice(item.price * item.qty)}`
    })
    .join('\n')

  let msg = `Hola Virginia! Quiero confirmar el pedido ${orderNumber}.\n\n`
  msg += `*DATOS DE FACTURACION Y ENVIO*\n`
  msg += `Nombre: ${checkoutData.name} ${checkoutData.last}\n`
  msg += `Documento: ${checkoutData.doc}\n`
  msg += `Telefono: ${checkoutData.tel}\n`
  msg += `Direccion: ${checkoutData.addr}, ${checkoutData.city}, ${checkoutData.prov} (CP: ${checkoutData.zip})`
  if (checkoutData.shipping) msg += `\nEmpresa de envio: ${checkoutData.shipping}`
  if (checkoutData.notes) msg += `\nNotas: ${checkoutData.notes}`
  msg += `\n\n*TU PEDIDO*\n${lines}\n\n*TOTAL: ${formatPrice(total)}*`
  msg += '\n\nEspero confirmacion para coordinar el pago. Gracias!'
  return msg
}

async function maybeRegisterCheckoutAccount(profile, password) {
  const shouldCreateAccount = document.getElementById('co-create-account')?.checked
  if (!shouldCreateAccount || currentUser || !password) return null

  const username = profile.email || `${profile.name} ${profile.last}`.trim()
  const { data, error } = await sb.rpc('register_user', {
    p_username: username,
    p_password: password
  })

  if (error || !data || !data.ok) {
    notify('No se pudo crear la cuenta. El pedido sigue como invitado.')
    return null
  }

  currentUser = {
    id: data.id,
    username: data.username,
    isAdmin: false,
    sessionToken: data.session_token,
    sessionExpiresAt: data.session_expires_at,
    profile: {
      name: profile.name,
      last: profile.last,
      prov: profile.prov,
      city: profile.city,
      addr: profile.addr,
      zip: profile.zip,
      tel: profile.tel,
      doc: profile.doc,
      shipping: profile.shipping,
      email: profile.email
    }
  }

  saveSession()
  updateNavAuth()
  await sb.rpc('update_profile', {
    p_session_token: getSessionToken(),
    p_name: profile.name,
    p_last_name: profile.last,
    p_prov: profile.prov,
    p_city: profile.city,
    p_addr: profile.addr,
    p_zip: profile.zip,
    p_tel: profile.tel,
    p_doc: profile.doc,
    p_shipping: profile.shipping,
    p_email: profile.email
  })
  notify('Cuenta creada correctamente')
  return currentUser
}

async function sendOrderWebhook(payload) {
  if (!APP_CONFIG.orderEmailWebhook) return
  try {
    await fetch(APP_CONFIG.orderEmailWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } catch (error) {
    console.warn('No se pudo disparar el webhook del pedido', error)
  }
}

async function submitCheckout() {
  const blankWindow = window.open('', '_blank')
  const checkoutData = {
    name: document.getElementById('co-name').value.trim(),
    last: document.getElementById('co-last').value.trim(),
    prov: document.getElementById('co-prov').value.trim(),
    city: document.getElementById('co-city').value.trim(),
    addr: document.getElementById('co-addr').value.trim(),
    zip: document.getElementById('co-zip').value.trim(),
    tel: document.getElementById('co-tel').value.trim(),
    doc: document.getElementById('co-doc').value.trim(),
    shipping: document.getElementById('co-shipping').value.trim(),
    email: document.getElementById('co-email').value.trim(),
    notes: document.getElementById('co-notes').value.trim()
  }
  const password = document.getElementById('co-pw').value

  if (!checkoutData.name || !checkoutData.last || !checkoutData.prov || !checkoutData.city || !checkoutData.addr || !checkoutData.zip || !checkoutData.tel || !checkoutData.doc) {
    if (blankWindow) blankWindow.close()
    notify('Completa todos los campos obligatorios')
    return
  }

  if (!cart.length) {
    if (blankWindow) blankWindow.close()
    notify('Tu carrito esta vacio')
    return
  }

  const total = cart.reduce((acc, item) => acc + Number(item.price || 0) * Number(item.qty || 0), 0)
  if (total < MIN_ORDER_TOTAL) {
    if (blankWindow) blankWindow.close()
    notify('El pedido minimo es de ' + formatPrice(MIN_ORDER_TOTAL))
    return
  }

  setCheckoutSubmitting(true)

  try {
    if (currentUser && !currentUser.isAdmin && getSessionToken()) {
      const { data } = await sb.rpc('update_profile', {
        p_session_token: getSessionToken(),
        p_name: checkoutData.name,
        p_last_name: checkoutData.last,
        p_prov: checkoutData.prov,
        p_city: checkoutData.city,
        p_addr: checkoutData.addr,
        p_zip: checkoutData.zip,
        p_tel: checkoutData.tel,
        p_doc: checkoutData.doc,
        p_shipping: checkoutData.shipping,
        p_email: checkoutData.email
      })
      if (data?.ok) {
        currentUser.profile = {
          name: checkoutData.name,
          last: checkoutData.last,
          prov: checkoutData.prov,
          city: checkoutData.city,
          addr: checkoutData.addr,
          zip: checkoutData.zip,
          tel: checkoutData.tel,
          doc: checkoutData.doc,
          shipping: checkoutData.shipping,
          email: checkoutData.email
        }
        saveSession()
      }
    } else {
      await maybeRegisterCheckoutAccount(checkoutData, password)
    }

    const items = buildOrderItemsPayload()
    const { data, error } = await sb.rpc('place_order', {
      p_session_token: currentUser && !currentUser.isAdmin ? getSessionToken() : null,
      p_items: items,
      p_total: total,
      p_customer_name: `${checkoutData.name} ${checkoutData.last}`,
      p_customer_tel: checkoutData.tel,
      p_customer_addr: checkoutData.addr,
      p_customer_prov: checkoutData.prov,
      p_customer_city: checkoutData.city,
      p_customer_zip: checkoutData.zip,
      p_customer_doc: checkoutData.doc,
      p_customer_email: checkoutData.email,
      p_shipping_company: checkoutData.shipping,
      p_notes: checkoutData.notes
    })

    if (error || !data || !data.ok) {
      if (blankWindow) blankWindow.close()
      await loadProducts()
      syncCartWithProducts()
      const message = data?.product_name
        ? `Sin stock suficiente para ${data.product_name}. Disponible: ${data.available_stock ?? 0}`
        : 'No se pudo registrar el pedido. Revisa el stock y vuelve a intentar.'
      notify(message)
      return
    }

    await loadProducts()
    syncCartWithProducts()
    if (currentUser && !currentUser.isAdmin) loadUserOrders().catch(() => {})

    const orderId = data.order_id
    const whatsappMessage = buildWhatsAppMessage(orderId, checkoutData, items, total)
    const whatsappUrl = `https://wa.me/5491176052037?text=${encodeURIComponent(whatsappMessage)}`

    trackEvent('purchase', {
      transaction_id: String(orderId),
      value: total,
      currency: 'ARS',
      items: items.map((item) => ({
        item_id: String(item.id),
        item_name: item.name,
        price: item.price,
        quantity: item.qty
      }))
    })

    sendOrderWebhook({
      type: 'order-confirmation',
      orderId,
      total,
      customer: checkoutData,
      items
    }).catch(() => {})

    cart = []
    updateCartUI()
    notify(`Pedido #${orderId} registrado`)
    window.location.hash = currentUser && !currentUser.isAdmin ? '#cuenta' : '#inicio'

    if (blankWindow) {
      blankWindow.location = whatsappUrl
    } else {
      window.open(whatsappUrl, '_blank')
    }
  } catch (error) {
    if (blankWindow) blankWindow.close()
    console.error(error)
    notify('Ocurrio un error al finalizar el pedido')
  } finally {
    setCheckoutSubmitting(false)
  }
}

/* PRODUCT PAGE */
function showProduct(id) {
  window.location.hash = '#producto-' + id
}

function setProductImage(index) {
  if (!currentPd) return
  currentPdImageIndex = Math.max(0, Math.min(index, currentPdImages.length - 1))
  const image = currentPdImages[currentPdImageIndex]
  const mainImage = document.getElementById('pd-img')
  if (mainImage) mainImage.src = image
  document.querySelectorAll('.pd-thumb').forEach((thumb, thumbIndex) => {
    thumb.classList.toggle('active', thumbIndex === currentPdImageIndex)
  })
}

function renderProductGallery(product) {
  currentPdImages = getProductImages(product)
  const thumbs = document.getElementById('pd-thumbs')
  if (thumbs) {
    thumbs.innerHTML = currentPdImages
      .map(
        (image, index) =>
          `<button class="pd-thumb${index === currentPdImageIndex ? ' active' : ''}" onclick="setProductImage(${index})" type="button"><img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)} ${index + 1}"></button>`
      )
      .join('')
  }
  setProductImage(currentPdImageIndex)
}

function renderOptionChips(containerId, rawValue) {
  const container = document.getElementById(containerId)
  if (!container) return
  const items = rawValue
    ? rawValue.split(',').map((item) => item.trim()).filter(Boolean)
    : ['Unico']
  container.innerHTML = items
    .map((item, index) => `<div class="pd-chip${index === 0 ? ' selected' : ''}" onclick="selectChip(this, '${containerId}')">${escapeHtml(item)}</div>`)
    .join('')
}

function _showProductUI(id) {
  const product = products.find((item) => item.id === id)
  if (!product) {
    window.location.hash = '#inicio'
    return
  }

  currentPd = product
  currentPdImageIndex = 0

  const breadcrumbName = document.getElementById('pd-name-bread')
  const breadcrumbCat = document.getElementById('pd-cat-bread')
  const title = document.getElementById('pd-title')
  const price = document.getElementById('pd-price')
  const oldPrice = document.getElementById('pd-oldprice')
  const desc = document.getElementById('pd-desc')

  if (breadcrumbName) breadcrumbName.textContent = product.name
  if (breadcrumbCat) breadcrumbCat.textContent = product.cat
  if (title) title.textContent = product.name
  if (price) price.textContent = formatPrice(product.price)
  if (oldPrice) oldPrice.textContent = product.oldprice > 0 ? formatPrice(product.oldprice) : ''
  if (desc) desc.textContent = product.desc || 'Sin descripcion'

  renderOptionChips('pd-sizes', product.sizes)
  renderOptionChips('pd-colors', product.colors)
  renderProductGallery(product)

  const qtyInput = document.getElementById('pd-qty-input')
  if (qtyInput) qtyInput.value = 1

  const addBtn = document.getElementById('pd-add-btn')
  const stockNotice = document.getElementById('pd-stock-notice')
  if (product.status === 'agotado' || Number(product.stock || 0) <= 0) {
    if (addBtn) {
      addBtn.textContent = 'SIN STOCK'
      addBtn.disabled = true
      addBtn.style.opacity = '0.5'
      addBtn.style.cursor = 'not-allowed'
    }
    if (stockNotice) {
      stockNotice.textContent = 'Agotado'
      stockNotice.className = 'pd-stock-notice error'
    }
  } else {
    if (addBtn) {
      addBtn.textContent = 'AGREGAR AL CARRITO'
      addBtn.disabled = false
      addBtn.style.opacity = '1'
      addBtn.style.cursor = 'pointer'
    }
    updateStockNotice()
  }

  renderRelated(product.cat, product.id)
  showPage('product-page')
  window.scrollTo({ top: 0, behavior: 'smooth' })

  trackEvent('view_item', {
    currency: 'ARS',
    value: product.price,
    items: [{ item_id: String(product.id), item_name: product.name, item_category: product.cat }]
  })
}

function renderRelated(cat, currentId) {
  let related = getVisibleProducts().filter((product) => product.cat === cat && product.id !== currentId)
  if (related.length < 3) {
    related = related.concat(getVisibleProducts().filter((product) => product.id !== currentId && product.cat !== cat))
  }
  related = related.slice(0, 6)

  const el = document.getElementById('related-carousel')
  if (!el) return
  el.innerHTML = related
    .map((product) => {
      const image = getPrimaryImage(product)
      return `
        <div class="product-card" onclick="showProduct(${product.id})">
          <div class="product-img-wrap">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" loading="lazy">
            ${product.badge === 'new' ? '<span class="product-badge badge-new">Nuevo</span>' : ''}
            ${product.badge === 'hot' ? '<span class="product-badge badge-hot">Popular</span>' : ''}
            ${product.badge === 'off' ? '<span class="product-badge badge-off">Oferta</span>' : ''}
            ${product.status === 'agotado' ? '<span class="product-badge badge-off" style="top:auto;bottom:8px;background:rgba(0,0,0,.7)">Agotado</span>' : ''}
          </div>
          <div class="product-info">
            <div class="product-cat">${escapeHtml(product.cat.toUpperCase())}</div>
            <div class="product-name">${escapeHtml(product.name)}</div>
            <div><span class="product-price">${formatPrice(product.price)}</span>${product.oldprice > 0 ? `<span class="product-price-old">${formatPrice(product.oldprice)}</span>` : ''}</div>
          </div>
        </div>`
    })
    .join('')
}

function selectChip(el, containerId) {
  document.querySelectorAll('#' + containerId + ' .pd-chip').forEach((chip) => chip.classList.remove('selected'))
  el.classList.add('selected')
  updateStockNotice()
}

function updateStockNotice() {
  if (!currentPd) return
  const notice = document.getElementById('pd-stock-notice')
  if (!notice) return
  if (currentPd.status === 'agotado' || Number(currentPd.stock || 0) <= 0) {
    notice.textContent = 'Agotado'
    notice.className = 'pd-stock-notice error'
    return
  }

  const sizeChip = document.querySelector('#pd-sizes .pd-chip.selected')
  const colorChip = document.querySelector('#pd-colors .pd-chip.selected')
  const cartItemId = currentPd.id + '_' + (sizeChip?.textContent || '') + '_' + (colorChip?.textContent || '')
  const remaining = getRemainingStock(currentPd, cartItemId)

  notice.className = 'pd-stock-notice'
  if (sizeChip && colorChip) {
    notice.textContent = `Hay ${remaining} unidad(es) disponibles`
  } else {
    notice.textContent = 'Selecciona talle y color'
  }
}

function changePdQty(delta) {
  if (!currentPd) return
  const sizeChip = document.querySelector('#pd-sizes .pd-chip.selected')
  const colorChip = document.querySelector('#pd-colors .pd-chip.selected')
  const cartItemId = currentPd.id + '_' + (sizeChip?.textContent || '') + '_' + (colorChip?.textContent || '')
  const max = Math.max(1, getRemainingStock(currentPd, cartItemId))
  const input = document.getElementById('pd-qty-input')
  if (!input) return

  let value = Number(input.value || 1) + delta
  if (value < 1) value = 1
  if (value > max) value = max
  input.value = value
  updateStockNotice()
}

function addCurrentPdToCart() {
  if (!currentPd || currentPd.status === 'agotado' || Number(currentPd.stock || 0) <= 0) return

  const sizeChip = document.querySelector('#pd-sizes .pd-chip.selected')
  const colorChip = document.querySelector('#pd-colors .pd-chip.selected')

  if (!sizeChip || !colorChip) {
    const notice = document.getElementById('pd-stock-notice')
    if (notice) {
      notice.textContent = 'Selecciona talle y color para continuar'
      notice.className = 'pd-stock-notice error'
    }
    return
  }

  const size = sizeChip.textContent
  const color = colorChip.textContent
  const qty = Number(document.getElementById('pd-qty-input').value || 1)
  const cartItemId = currentPd.id + '_' + size + '_' + color
  const existing = cart.find((item) => item.cartItemId === cartItemId)
  const remaining = getRemainingStock(currentPd, cartItemId)

  if (qty > remaining) {
    const notice = document.getElementById('pd-stock-notice')
    if (notice) {
      notice.textContent = remaining <= 0 ? 'Ya agregaste todo el stock disponible de esta prenda' : `Solo puedes agregar ${remaining} unidad(es) mas`
      notice.className = 'pd-stock-notice error'
    }
    return
  }

  if (existing) {
    existing.qty += qty
  } else {
    cart.push({
      ...currentPd,
      img: getPrimaryImage(currentPd),
      images: getProductImages(currentPd),
      cartItemId,
      qty,
      selectedSize: size,
      selectedColor: color
    })
  }

  updateCartUI()
  notify(currentPd.name + ' agregado')
  trackEvent('add_to_cart', {
    currency: 'ARS',
    value: currentPd.price * qty,
    items: [{ item_id: String(currentPd.id), item_name: currentPd.name, quantity: qty }]
  })
  openCart()
}

function scrollCarousel(dir) {
  const carousel = document.getElementById('related-carousel')
  const card = carousel?.querySelector('.product-card')
  if (!carousel) return
  const amount = card ? card.offsetWidth + 24 : 300
  carousel.scrollBy({ left: dir * amount, behavior: 'smooth' })
}

/* ADMIN PRODUCTS */
function renderAdminProducts() {
  const query = (document.getElementById('search-productos')?.value || '').trim().toLowerCase()
  let list = products.slice()

  if (query) {
    list = list.filter((product) => {
      const haystack = [product.name, product.cat, product.desc].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }

  if (_filterCat) list = list.filter((product) => product.cat === _filterCat)
  if (_filterStatus) list = list.filter((product) => product.status === _filterStatus)

  const body = document.getElementById('products-table-body')
  if (!body) return

  body.innerHTML = list
    .map((product) => `
      <tr>
        <td><img class="td-img" src="${escapeHtml(getPrimaryImage(product))}" alt="${escapeHtml(product.name)}"></td>
        <td>${escapeHtml(product.name)}</td>
        <td style="color:#777;font-size:11px">${escapeHtml(product.cat)}</td>
        <td class="td-price">${formatPrice(product.price)}</td>
        <td style="color:${product.stock === 0 ? 'var(--danger)' : product.stock < 5 ? '#d4a04a' : '#8bc34a'}">${product.stock}</td>
        <td><span class="td-badge badge-${escapeHtml(product.status)}">${escapeHtml(product.status)}</span></td>
        <td><div class="td-actions"><button class="btn-edit" onclick="editProduct(${product.id})">Editar</button><button class="btn-del" onclick="deleteProduct(${product.id})">×</button></div></td>
      </tr>`)
    .join('')

  updateDash()
  renderFrontend()
}

function renderProductUploadPreview(urls = null) {
  const preview = document.getElementById('product-upload-preview')
  if (!preview) return
  const gallery = urls || uniqueList([...normalizeImageList(document.getElementById('f-images')?.value || ''), document.getElementById('f-img')?.value || ''].filter(Boolean))
  preview.innerHTML = gallery.length
    ? gallery.map((url) => `<img src="${escapeHtml(url)}" alt="preview">`).join('')
    : ''
}

function openModal(product = null) {
  editingId = product ? product.id : null
  const title = document.getElementById('modal-title')
  if (title) title.textContent = product ? 'EDITAR PRODUCTO' : 'NUEVO PRODUCTO'

  const fields = {
    name: 'f-name',
    cat: 'f-cat',
    price: 'f-price',
    oldprice: 'f-oldprice',
    stock: 'f-stock',
    status: 'f-status',
    badge: 'f-badge',
    sizes: 'f-sizes',
    colors: 'f-colors',
    img: 'f-img',
    desc: 'f-desc'
  }

  Object.entries(fields).forEach(([key, id]) => {
    const input = document.getElementById(id)
    if (!input) return
    input.value = product ? product[key] || '' : ''
  })

  const imagesInput = document.getElementById('f-images')
  if (imagesInput) imagesInput.value = product ? getProductImages(product).join('\n') : ''
  const uploadInput = document.getElementById('f-images-upload')
  if (uploadInput) uploadInput.value = ''
  if (!product && document.getElementById('f-status')) document.getElementById('f-status').value = 'activo'

  renderProductUploadPreview(product ? getProductImages(product) : [])
  document.getElementById('product-modal')?.classList.add('show')
}

function editProduct(id) {
  openModal(products.find((product) => product.id === id))
}

function closeModal() {
  document.getElementById('product-modal')?.classList.remove('show')
  editingId = null
}

async function uploadProductImages() {
  if (!currentUser?.isAdmin || !getSessionToken()) {
    notify('Debes iniciar sesion como admin')
    return
  }

  const input = document.getElementById('f-images-upload')
  const button = document.querySelector('#product-modal .upload-row .btn-save')
  const files = [...(input?.files || [])]
  if (!files.length) {
    notify('Selecciona al menos una imagen')
    return
  }

  if (button) {
    button.disabled = true
    button.textContent = 'Subiendo...'
  }

  try {
    const uploadedUrls = []
    for (const file of files) {
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, '-')
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`
      const { error } = await sb.storage.from(STORAGE_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })
      if (error) throw error
      const { data } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path)
      if (data?.publicUrl) uploadedUrls.push(data.publicUrl)
    }

    const imageField = document.getElementById('f-images')
    const primaryField = document.getElementById('f-img')
    const merged = uniqueList([...normalizeImageList(imageField?.value || ''), ...uploadedUrls])
    if (imageField) imageField.value = merged.join('\n')
    if (primaryField && !primaryField.value.trim() && merged[0]) primaryField.value = merged[0]
    renderProductUploadPreview(merged)
    notify('Imagenes subidas correctamente')
  } catch (error) {
    console.error(error)
    notify('No se pudo subir la imagen. Revisa Supabase Storage.')
  } finally {
    if (button) {
      button.disabled = false
      button.textContent = 'Subir a Storage'
    }
    if (input) input.value = ''
  }
}

async function saveProduct() {
  if (!currentUser?.isAdmin || !getSessionToken()) {
    notify('Sesion de admin no valida')
    return
  }

  const name = document.getElementById('f-name').value.trim()
  const cat = document.getElementById('f-cat').value
  const price = Number(document.getElementById('f-price').value)
  if (!name || !cat || !price) {
    notify('Completa nombre, categoria y precio')
    return
  }

  const primaryImage = document.getElementById('f-img').value.trim()
  const galleryImages = normalizeImageList(document.getElementById('f-images').value)
  const mergedImages = uniqueList([primaryImage, ...galleryImages].filter(Boolean))
  const finalPrimaryImage = mergedImages[0] || 'img/inbound4849073990589537579.jpg'

  const { data, error } = await sb.rpc('admin_save_product', {
    p_session_token: getSessionToken(),
    p_id: editingId || null,
    p_name: name,
    p_cat: cat,
    p_price: price,
    p_oldprice: Number(document.getElementById('f-oldprice').value) || 0,
    p_stock: Number(document.getElementById('f-stock').value) || 0,
    p_status: document.getElementById('f-status').value,
    p_badge: document.getElementById('f-badge').value,
    p_sizes: document.getElementById('f-sizes').value,
    p_colors: document.getElementById('f-colors').value,
    p_img: finalPrimaryImage,
    p_images: mergedImages.join('\n'),
    p_description: document.getElementById('f-desc').value
  })

  if (error || !data || !data.ok) {
    notify('No se pudo guardar el producto')
    return
  }

  notify(data.action === 'updated' ? 'Producto actualizado' : 'Producto agregado')
  await loadProducts()
  populateCategoryControls()
  syncCartWithProducts()
  closeModal()
  renderAdminProducts()
}

async function deleteProduct(id) {
  if (!currentUser?.isAdmin || !getSessionToken()) {
    notify('Sesion no valida')
    return
  }
  if (!confirm('¿Eliminar este producto?')) return

  const { data, error } = await sb.rpc('admin_delete_product', {
    p_session_token: getSessionToken(),
    p_id: id
  })

  if (error || !data || !data.ok) {
    notify('No se pudo eliminar el producto')
    return
  }

  await loadProducts()
  syncCartWithProducts()
  renderAdminProducts()
  notify('Producto eliminado')
}

/* CATEGORIES */
function renderCategories() {
  const body = document.getElementById('cat-table-body')
  if (!body) return
  body.innerHTML = categories
    .map(
      (category) => `
        <tr>
          <td style="font-weight:500">${escapeHtml(category.name)}</td>
          <td style="color:#777">${products.filter((product) => product.cat === category.name).length}</td>
          <td><img style="width:44px;height:44px;object-fit:cover;border:1px solid var(--border)" src="${escapeHtml(category.img || getPrimaryImage(products.find((product) => product.cat === category.name) || {}))}" alt="${escapeHtml(category.name)}"></td>
          <td><span class="td-badge ${category.visible === 'si' ? 'badge-activo' : 'badge-inactivo'}">${category.visible === 'si' ? 'Visible' : 'Oculto'}</span></td>
          <td><div class="td-actions"><button class="btn-edit" onclick="toggleCat(${category.id})">${category.visible === 'si' ? 'Ocultar' : 'Mostrar'}</button><button class="btn-del" onclick="deleteCat(${category.id})">×</button></div></td>
        </tr>`
    )
    .join('')
}

function openCatModal() {
  document.getElementById('cat-modal')?.classList.add('show')
}

function closeCatModal() {
  document.getElementById('cat-modal')?.classList.remove('show')
}

async function saveCat() {
  if (!currentUser?.isAdmin || !getSessionToken()) {
    notify('Sesion no valida')
    return
  }

  const name = document.getElementById('cat-name-input').value.trim()
  if (!name) {
    notify('Escribe un nombre')
    return
  }

  const { data, error } = await sb.rpc('admin_save_category', {
    p_session_token: getSessionToken(),
    p_name: name,
    p_img: document.getElementById('cat-img-input').value || '',
    p_visible: document.getElementById('cat-visible').value
  })

  if (error || !data || !data.ok) {
    notify('No se pudo crear la categoria')
    return
  }

  await loadCategories()
  populateCategoryControls()
  closeCatModal()
  renderCategories()
  notify('Categoria creada')
}

async function toggleCat(id) {
  if (!currentUser?.isAdmin || !getSessionToken()) return
  const category = categories.find((item) => item.id === id)
  if (!category) return
  const nextVisible = category.visible === 'si' ? 'no' : 'si'

  await sb.rpc('admin_toggle_category', {
    p_session_token: getSessionToken(),
    p_id: id,
    p_visible: nextVisible
  })

  await loadCategories()
  populateCategoryControls()
  renderCategories()
  notify('Visibilidad actualizada')
}

async function deleteCat(id) {
  if (!currentUser?.isAdmin || !getSessionToken()) return
  if (!confirm('¿Eliminar esta categoria?')) return

  await sb.rpc('admin_delete_category', {
    p_session_token: getSessionToken(),
    p_id: id
  })

  await loadCategories()
  populateCategoryControls()
  renderCategories()
  notify('Categoria eliminada')
}

/* ADMIN ORDERS + DASHBOARD */
function renderDashboardOrders() {
  const el = document.getElementById('dash-last-orders')
  if (!el) return
  if (!orders.length) {
    el.innerHTML = '<div style="color:#555;font-size:12px;text-align:center;padding:16px">Todavia no hay pedidos.</div>'
    return
  }

  el.innerHTML = orders
    .slice(0, 5)
    .map((order) => `
      <div style="display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid rgba(42,40,36,.45)">
        <div>
          <div style="font-size:12px;color:var(--white)">#${order.id} - ${escapeHtml(order.customer_name || 'Cliente')}</div>
          <div style="font-size:10px;color:#666">${formatDate(order.created_at)}</div>
        </div>
        <div style="text-align:right">
          <div class="td-badge ${getStatusBadgeClass(order.status)}">${escapeHtml(order.status || 'pendiente')}</div>
          <div style="font-size:12px;color:var(--accent);margin-top:6px">${formatPrice(order.total)}</div>
        </div>
      </div>`)
    .join('')
}

function renderAdminOrders() {
  const container = document.getElementById('admin-orders-container')
  if (!container) return

  const filter = document.getElementById('orders-filter')?.value || ''
  let list = orders.slice()
  if (filter) list = list.filter((order) => order.status === filter)

  if (!list.length) {
    container.innerHTML = '<div style="color:#555;font-size:12px;text-align:center;padding:30px">Todavia no hay pedidos para mostrar.</div>'
    renderDashboardOrders()
    return
  }

  container.innerHTML = list
    .map((order) => {
      const itemsHtml = Array.isArray(order.items)
        ? order.items
            .map((item) => {
              const size = item.size ? ` T:${escapeHtml(item.size)}` : ''
              const color = item.color ? ` C:${escapeHtml(item.color)}` : ''
              return `<div style="font-size:11px;color:#888;padding:3px 0">• ${escapeHtml(item.name)}${size}${color} ×${item.qty} - ${formatPrice(Number(item.price || 0) * Number(item.qty || 0))}</div>`
            })
            .join('')
        : ''

      return `<div style="background:var(--surface);border:1px solid var(--border);padding:20px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
          <div>
            <div style="font-family:var(--fd);font-size:20px;letter-spacing:.08em;color:var(--accent)">PEDIDO #${order.id}</div>
            <div style="font-size:11px;color:#777;margin-top:6px">${formatDate(order.created_at)}</div>
            <div style="font-size:12px;color:var(--white);margin-top:12px">${escapeHtml(order.customer_name || 'Cliente')}</div>
            <div style="font-size:11px;color:#888;margin-top:4px">${escapeHtml(order.customer_tel || 'Sin telefono')}</div>
            <div style="font-size:11px;color:#888;margin-top:4px">${escapeHtml(order.customer_addr || '')} ${escapeHtml(order.customer_city || '')} ${escapeHtml(order.customer_prov || '')}</div>
            ${order.shipping_company ? `<div style="font-size:11px;color:#888;margin-top:4px">Transporte: ${escapeHtml(order.shipping_company)}</div>` : ''}
          </div>
          <div style="min-width:220px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <span class="td-badge ${getStatusBadgeClass(order.status)}">${escapeHtml(order.status || 'pendiente')}</span>
              <span style="font-family:var(--fd);font-size:22px;color:var(--accent)">${formatPrice(order.total)}</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn-edit" onclick="updateOrderStatus(${order.id}, 'pendiente')">Pendiente</button>
              <button class="btn-edit" onclick="updateOrderStatus(${order.id}, 'enviado')">Enviado</button>
              <button class="btn-del" onclick="updateOrderStatus(${order.id}, 'cancelado')">Cancelado</button>
            </div>
          </div>
        </div>
        <div style="border-top:1px solid var(--border);margin-top:14px;padding-top:12px">${itemsHtml}</div>
        ${order.notes ? `<div style="font-size:11px;color:#888;margin-top:12px"><strong style="color:var(--gray-light)">Notas:</strong> ${escapeHtml(order.notes)}</div>` : ''}
      </div>`
    })
    .join('')

  renderDashboardOrders()
}

async function updateOrderStatus(orderId, status) {
  if (!currentUser?.isAdmin || !getSessionToken()) {
    notify('Sesion no valida')
    return
  }

  const { data, error } = await sb.rpc('admin_update_order_status', {
    p_session_token: getSessionToken(),
    p_order_id: orderId,
    p_status: status
  })

  if (error || !data || !data.ok) {
    notify('No se pudo actualizar el pedido')
    return
  }

  notify('Estado actualizado')
  await loadAdminOrders()
}

function updateDash() {
  const activeProducts = products.filter((product) => product.status === 'activo').length
  const statProducts = document.getElementById('stat-prods')
  const statProductsSub = document.getElementById('stat-prods-sub')
  if (statProducts) statProducts.textContent = String(activeProducts)
  if (statProductsSub) statProductsSub.textContent = `${products.filter((product) => product.status === 'agotado').length} agotado(s)`

  const stockAlerts = document.getElementById('stock-alerts')
  if (stockAlerts) {
    const out = products.filter((product) => Number(product.stock || 0) === 0)
    const low = products.filter((product) => Number(product.stock || 0) > 0 && Number(product.stock || 0) < 5)
    let html = ''
    out.forEach((product) => {
      html += `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:#1a0f0f;border:1px solid rgba(226,75,74,.22)"><span style="color:var(--danger)">●</span><div><div style="font-size:12px">${escapeHtml(product.name)}</div><div style="font-size:9px;color:var(--danger);text-transform:uppercase;letter-spacing:.08em">Sin stock</div></div></div>`
    })
    low.forEach((product) => {
      html += `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:#191400;border:1px solid rgba(186,117,23,.2)"><span style="color:#d4a04a">●</span><div><div style="font-size:12px">${escapeHtml(product.name)}</div><div style="font-size:9px;color:#d4a04a;text-transform:uppercase;letter-spacing:.08em">Stock bajo: ${product.stock}</div></div></div>`
    })
    stockAlerts.innerHTML = html || '<div style="font-size:12px;color:#555;text-align:center;padding:16px">Sin alertas</div>'
  }

  const now = new Date()
  const monthlyOrders = orders.filter((order) => {
    const date = new Date(order.created_at)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })
  const monthlySales = monthlyOrders.reduce((acc, order) => acc + Number(order.total || 0), 0)
  const monthlyCustomers = new Set(
    monthlyOrders.map((order) => order.customer_email || order.customer_tel || order.customer_name || order.id)
  ).size

  const statOrders = document.getElementById('stat-orders')
  const statOrdersSub = document.getElementById('stat-orders-sub')
  const statSales = document.getElementById('stat-sales')
  const statSalesSub = document.getElementById('stat-sales-sub')
  const statCustomers = document.getElementById('stat-customers')
  const statCustomersSub = document.getElementById('stat-customers-sub')

  if (statOrders) statOrders.textContent = String(monthlyOrders.length)
  if (statOrdersSub) statOrdersSub.textContent = `${monthlyOrders.filter((order) => order.status === 'pendiente').length} pendiente(s)`
  if (statSales) statSales.textContent = formatPrice(monthlySales)
  if (statSalesSub) statSalesSub.textContent = monthlyOrders.length ? 'Actualizado con pedidos reales' : 'Sin ventas registradas'
  if (statCustomers) statCustomers.textContent = String(monthlyCustomers)
  if (statCustomersSub) statCustomersSub.textContent = monthlyOrders.length ? 'Clientes del mes' : 'Este mes'

  renderDashboardOrders()
}

/* CONTACT */
function submitContactForm() {
  const name = document.getElementById('cf-name').value.trim()
  const email = document.getElementById('cf-email').value.trim()
  const subject = document.getElementById('cf-subject').value.trim()
  const message = document.getElementById('cf-message').value.trim()

  if (!name || !email || !subject) {
    notify('Completa nombre, email y asunto')
    return
  }

  let text = `Hola Virginia! Me contacto desde la web:\n\n*Nombre:* ${name}\n*Email:* ${email}\n*Asunto:* ${subject}`
  if (message) text += `\n*Mensaje:* ${message}`
  window.open(`https://wa.me/5491176052037?text=${encodeURIComponent(text)}`, '_blank')
  notify('Redirigiendo a WhatsApp...')
}

/* ANALYTICS + PWA */
function initAnalytics() {
  const measurementId = APP_CONFIG.gaMeasurementId
  if (!measurementId || window.gtag) return

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  document.head.appendChild(script)

  window.gtag('js', new Date())
  window.gtag('config', measurementId)
}

function trackEvent(name, params) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', name, params)
  }
}

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredInstallPrompt = event
    document.getElementById('install-app-btn')?.classList.remove('hidden')
  })

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null
    document.getElementById('install-app-btn')?.classList.add('hidden')
    notify('App instalada correctamente')
  })
}

async function promptInstallApp() {
  if (!deferredInstallPrompt) return
  deferredInstallPrompt.prompt()
  await deferredInstallPrompt.userChoice
  deferredInstallPrompt = null
  document.getElementById('install-app-btn')?.classList.add('hidden')
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return
  try {
    await navigator.serviceWorker.register('service-worker.js')
  } catch (error) {
    console.warn('No se pudo registrar el service worker', error)
  }
}

/* INIT */
async function initApp() {
  restoreCart()
  restoreSession()
  initAnalytics()
  setupInstallPrompt()

  try {
    await Promise.all([loadProducts(), loadCategories()])
  } catch (error) {
    console.warn('Error cargando datos:', error)
    notify('No pudimos cargar el catalogo completo')
  }

  populateCategoryControls()
  syncCartWithProducts()
  renderFrontend()
  renderCategories()
  renderAdminProducts()
  updateNavAuth()
  handleHash()

  if (currentUser?.isAdmin) {
    loadAdminOrders().catch(() => {})
  }

  const searchInput = document.getElementById('search-productos')
  if (searchInput) {
    let searchTimer = null
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer)
      searchTimer = setTimeout(renderAdminProducts, 250)
    })
  }

  document.getElementById('f-img')?.addEventListener('input', () => renderProductUploadPreview())
  document.getElementById('f-images')?.addEventListener('input', () => renderProductUploadPreview())

  hideLoadingScreen()
  registerServiceWorker().catch(() => {})
}

initApp()
