/* ========================================
   متجرك - Supabase Edition
   العملة: الدينار الجزائري (د.ج)
   ======================================== */

// ⚠️ استبدل هذين بقيم مشروعك من Supabase Dashboard → Project Settings → API
const SUPABASE_URL = "https://jeixaxbcqytzbdsksdol.supabase.co";
const SUPABASE_ANON_KEY = "sb_secret_1vSOdCeI3Yi-SydF36eDSw_IQnpY8ik";

let supabase = null;
let currentQty = 1;
let sliderInterval = null;
let currentSlide = 0;
let currentOrderFilter = 'all';

function initSupabase() {
    if (!window.supabase) {
        throw new Error('مكتبة Supabase لم تُحمل. تأكد من وضع <script> قبل app.js');
    }
    if (SUPABASE_URL.includes('YOUR_PROJECT')) {
        throw new Error('استبدل YOUR_PROJECT في SUPABASE_URL بقيمة حقيقية من Supabase');
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Supabase connected");
}

async function logoutAdmin() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}

async function uploadImage(file, folder) {
    if (!file) return null;
    const fileName = `${folder}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('images').upload(fileName, file);
    if (error) { console.error(error); return null; }
    const { data } = supabase.storage.from('images').getPublicUrl(fileName);
    return data.publicUrl;
}

function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => { preview.src = e.target.result; preview.style.display = 'block'; };
        reader.readAsDataURL(input.files[0]);
    }
}

async function displayProducts() {
    const grid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    const countEl = document.getElementById('productsCount');
    if (!grid) return;
    const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    const { data: products, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    
    let filtered = products || [];
    if (query) filtered = filtered.filter(p => p.name.toLowerCase().includes(query) || (p.category && p.category.toLowerCase().includes(query)));
    
    if (filtered.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        if (countEl) countEl.textContent = 'لا توجد منتجات';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';
    if (countEl) countEl.textContent = `${filtered.length} منتج`;
    
    grid.innerHTML = filtered.map(p => `
        <div class="product-card" onclick="goToProduct(${p.id})">
            <img src="${p.image || 'https://via.placeholder.com/400x400/1a1a1a/666?text=No+Image'}" alt="${p.name}" class="product-image" onerror="this.src='https://via.placeholder.com/400x400/1a1a1a/666?text=No+Image'">
            <div class="product-info">
                <div class="product-category">${p.category || 'عام'}</div>
                <h3 class="product-name">${p.name}</h3>
                <div class="product-price">${parseFloat(p.price).toFixed(2)} د.ج</div>
                <div class="product-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-primary" onclick="addToCart(${p.id})">أضف للسلة</button>
                </div>
            </div>
        </div>
    `).join('');
}

function searchProducts() { displayProducts(); }
function goToProduct(productId) { window.location.href = `product.html?id=${productId}`; }

async function displayProductDetail() {
    const container = document.getElementById('productDetail');
    if (!container) return;
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    const { data: p, error } = await supabase.from('products').select('*').eq('id', productId).single();
    if (error || !p) {
        container.innerHTML = `<div class="empty-state"><p>المنتج غير موجود</p><a href="index.html" class="btn btn-primary">العودة للرئيسية</a></div>`;
        return;
    }
    window.currentProductPrice = parseFloat(p.price);
    container.innerHTML = `
        <img src="${p.image || 'https://via.placeholder.com/600x600/1a1a1a/666?text=No+Image'}" alt="${p.name}" class="product-detail-image" onerror="this.src='https://via.placeholder.com/600x600/1a1a1a/666?text=No+Image'">
        <div class="product-detail-info">
            <div class="product-category">${p.category || 'عام'}</div>
            <h1>${p.name}</h1>
            <div class="product-detail-price">${parseFloat(p.price).toFixed(2)} د.ج</div>
            <p class="product-detail-desc">${p.description || 'لا يوجد وصف'}</p>
            <div class="quantity-selector">
                <button onclick="changeQty(-1)">−</button>
                <span id="qtyValue">1</span>
                <button onclick="changeQty(1)">+</button>
            </div>
            <button class="btn btn-primary" onclick="addToCart(${productId}, getQty())" style="width:auto;">
                أضف للسلة - <span id="btnTotal">${parseFloat(p.price).toFixed(2)}</span> د.ج
            </button>
        </div>
    `;
}

function changeQty(delta) {
    currentQty = Math.max(1, currentQty + delta);
    const qtyEl = document.getElementById('qtyValue');
    const btnTotal = document.getElementById('btnTotal');
    if (qtyEl) qtyEl.textContent = currentQty;
    if (btnTotal && window.currentProductPrice) btnTotal.textContent = (currentQty * window.currentProductPrice).toFixed(2);
}
function getQty() { return currentQty; }

function getCart() { return JSON.parse(localStorage.getItem('store_cart')) || []; }
function saveCart(cart) { localStorage.setItem('store_cart', JSON.stringify(cart)); }

async function addToCart(productId, quantity = 1) {
    const { data: product, error } = await supabase.from('products').select('*').eq('id', productId).single();
    if (error || !product) return;
    let cart = getCart();
    const existing = cart.find(item => item.id === productId);
    if (existing) existing.quantity += quantity;
    else cart.push({ id: productId, name: product.name, price: product.price, image: product.image, quantity });
    saveCart(cart);
    updateCartCount();
    showToast('تمت الإضافة للسلة بنجاح', 'success');
}

function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('#cartCount').forEach(el => el.textContent = count);
}

function displayCart() {
    const container = document.getElementById('cartItems');
    if (!container) return;
    const cart = getCart();
    if (cart.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>السلة فارغة</p><a href="index.html" class="btn btn-primary">تسوق الآن</a></div>`;
        document.getElementById('subtotal').textContent = '0 د.ج';
        document.getElementById('totalPrice').textContent = '0 د.ج';
        return;
    }
    let total = 0;
    container.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="cart-item">
                <img src="${item.image || 'https://via.placeholder.com/80x80/1a1a1a/666?text=No+Image'}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/80x80/1a1a1a/666?text=No+Image'">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${parseFloat(item.price).toFixed(2)} د.ج</div>
                    <div class="cart-item-qty">الكمية: ${item.quantity}</div>
                </div>
                <button class="btn btn-danger" onclick="removeFromCart('${item.id}')" style="padding:6px 12px;font-size:0.8rem;">حذف</button>
            </div>
        `;
    }).join('');
    document.getElementById('subtotal').textContent = total.toFixed(2) + ' د.ج';
    document.getElementById('totalPrice').textContent = total.toFixed(2) + ' د.ج';
}

function removeFromCart(productId) {
    let cart = getCart().filter(item => item.id != productId);
    saveCart(cart);
    displayCart();
    updateCartCount();
    showToast('تم الحذف من السلة', 'success');
}

async function handleCheckout(e) {
    e.preventDefault();
    const cart = getCart();
    if (cart.length === 0) { showToast('السلة فارغة!', 'error'); return; }
    const btn = document.getElementById('submitOrder');
    btn.disabled = true;
    btn.textContent = 'جاري إرسال الطلب...';
    
    const orderData = {
        order_id: 'ORD-' + Date.now(),
        customer_name: document.getElementById('customerName').value.trim(),
        customer_phone: document.getElementById('customerPhone').value.trim(),
        customer_email: document.getElementById('customerEmail').value.trim(),
        customer_city: document.getElementById('customerCity').value.trim(),
        customer_address: document.getElementById('customerAddress').value.trim(),
        notes: document.getElementById('orderNotes')?.value.trim() || '',
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        status: 'pending'
    };
    
    const { error } = await supabase.from('orders').insert([orderData]);
    if (error) {
        console.error(error);
        showToast('حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
        btn.disabled = false;
        btn.textContent = 'تأكيد الطلب';
        return;
    }
    sendEmail(orderData);
    sendToGoogleSheets(orderData);
    saveCart([]);
    updateCartCount();
    showToast('تم إرسال طلبك بنجاح!', 'success');
    document.getElementById('checkoutForm').reset();
    displayCart();
    btn.disabled = false;
    btn.textContent = 'تأكيد الطلب';
}

function sendEmail(orderData) {
    const settings = JSON.parse(localStorage.getItem('store_settings') || '{}');
    if (!settings.emailjs_key) return;
    try {
        emailjs.init(settings.emailjs_key);
        emailjs.send(settings.emailjs_service, settings.emailjs_template, {
            to_email: orderData.customer_email,
            to_name: orderData.customer_name,
            order_id: orderData.order_id,
            order_details: orderData.items.map(i => `${i.name} x${i.quantity} - ${(i.price*i.quantity).toFixed(2)} د.ج`).join('\n'),
            order_total: orderData.total.toFixed(2) + ' د.ج',
            customer_phone: orderData.customer_phone,
            customer_address: `${orderData.customer_city} - ${orderData.customer_address}`
        });
    } catch (e) { console.error(e); }
}

function sendToGoogleSheets(orderData) {
    const settings = JSON.parse(localStorage.getItem('store_settings') || '{}');
    if (!settings.sheets_url) return;
    fetch(settings.sheets_url, {
        method: 'POST',
        body: JSON.stringify({
            orderId: orderData.order_id, name: orderData.customer_name, phone: orderData.customer_phone,
            email: orderData.customer_email, city: orderData.customer_city, address: orderData.customer_address,
            items: orderData.items.map(i => `${i.name}(x${i.quantity})`).join(', '),
            total: orderData.total, date: new Date().toLocaleString('ar-DZ'), notes: orderData.notes
        }),
        headers: { 'Content-Type': 'application/json' }, mode: 'no-cors'
    });
}

function showSection(sectionId, linkEl) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.getElementById('sec-' + sectionId)?.classList.add('active');
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    if (linkEl) linkEl.classList.add('active');
    const titles = { dashboard: 'لوحة المعلومات', products: 'إدارة المنتجات', orders: 'إدارة الطلبات', earnings: 'الأرباح', slider: 'إدارة السلايدر', settings: 'الإعدادات' };
    document.getElementById('pageTitle').textContent = titles[sectionId] || '';
    if (sectionId === 'dashboard') loadDashboard();
    if (sectionId === 'products') loadAdminProducts();
    if (sectionId === 'orders') loadOrders('all');
    if (sectionId === 'earnings') loadEarnings();
    if (sectionId === 'slider') loadSliderAdmin();
    if (sectionId === 'settings') loadSettings();
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

async function loadDashboard() {
    const { data: products } = await supabase.from('products').select('id');
    const { data: orders } = await supabase.from('orders').select('*');
    const productsCount = products?.length || 0;
    const allOrders = orders || [];
    const pending = allOrders.filter(o => o.status === 'pending').length;
    const completed = allOrders.filter(o => o.status === 'completed');
    const totalEarnings = completed.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    
    document.getElementById('statProducts').textContent = productsCount;
    document.getElementById('statOrders').textContent = allOrders.length;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statEarnings').textContent = totalEarnings.toFixed(2) + ' د.ج';
    
    const tbody = document.getElementById('recentOrdersTable');
    if (!tbody) return;
    const recent = allOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:32px;">لا توجد طلبات بعد</td></tr>';
        return;
    }
    tbody.innerHTML = recent.map(o => {
        const statusClass = { pending: 'status-pending', completed: 'status-completed', cancelled: 'status-cancelled', returned: 'status-returned' }[o.status] || 'status-pending';
        const statusText = { pending: 'معلق', completed: 'تم', cancelled: 'ملغي', returned: 'مرتجع' }[o.status] || 'معلق';
        const date = o.created_at ? new Date(o.created_at).toLocaleDateString('ar-DZ') : '-';
        return `<tr><td>${o.order_id}</td><td>${o.customer_name}</td><td>${parseFloat(o.total).toFixed(2)} د.ج</td><td><span class="status-badge ${statusClass}">${statusText}</span></td><td>${date}</td></tr>`;
    }).join('');
}

async function loadAdminProducts() {
    const tbody = document.getElementById('productsTable');
    const badge = document.getElementById('totalProductsBadge');
    if (!tbody) return;
    const { data: products, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    if (badge) badge.textContent = (products?.length || 0) + ' منتج';
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">لا توجد منتجات بعد</td></tr>';
        return;
    }
    tbody.innerHTML = products.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><img src="${p.image || 'https://via.placeholder.com/50x50/1a1a1a/666?text=No+Image'}" alt="" onerror="this.src='https://via.placeholder.com/50x50/1a1a1a/666?text=No+Image'" style="width:50px;height:50px;object-fit:cover;border:1px solid var(--border-color);"></td>
            <td>${p.name}</td>
            <td>${parseFloat(p.price).toFixed(2)} د.ج</td>
            <td>${p.stock || 0}</td>
            <td>
                <button class="btn btn-edit" onclick="editProduct(${p.id})">تعديل</button>
                <button class="btn btn-danger" onclick="deleteProductAdmin(${p.id})">حذف</button>
            </td>
        </tr>
    `).join('');
}

async function handleProductSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const category = document.getElementById('productCategory').value.trim();
    const stock = parseInt(document.getElementById('productStock').value) || 0;
    const description = document.getElementById('productDesc').value.trim();
    const imageFile = document.getElementById('productImageFile').files[0];
    const existingImage = document.getElementById('productImage').value;
    if (!name || isNaN(price)) { showToast('يرجى ملء الحقول المطلوبة', 'error'); return; }
    
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = id ? 'جاري الحفظ...' : 'جاري الإضافة...';
    
    let imageUrl = existingImage;
    if (imageFile) imageUrl = await uploadImage(imageFile, 'products');
    const data = { name, price, category, stock, image: imageUrl, description };
    
    if (id) {
        const { error } = await supabase.from('products').update(data).eq('id', id);
        if (!error) showToast('تم تعديل المنتج بنجاح', 'success');
    } else {
        const { error } = await supabase.from('products').insert([data]);
        if (!error) showToast('تمت إضافة المنتج بنجاح', 'success');
    }
    loadAdminProducts();
    resetProductForm();
    btn.disabled = false;
    btn.textContent = id ? 'حفظ التعديلات' : 'إضافة المنتج';
}

async function editProduct(productId) {
    const { data: p, error } = await supabase.from('products').select('*').eq('id', productId).single();
    if (error || !p) return;
    document.getElementById('productId').value = productId;
    document.getElementById('productName').value = p.name;
    document.getElementById('productPrice').value = p.price;
    document.getElementById('productCategory').value = p.category || '';
    document.getElementById('productStock').value = p.stock || 0;
    document.getElementById('productImage').value = p.image || '';
    document.getElementById('productDesc').value = p.description || '';
    const preview = document.getElementById('productPreview');
    if (p.image) { preview.src = p.image; preview.style.display = 'block'; }
    else preview.style.display = 'none';
    document.getElementById('submitBtn').textContent = 'حفظ التعديلات';
    document.getElementById('cancelBtn').style.display = 'inline-flex';
    document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
}

async function deleteProductAdmin(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    await supabase.from('products').delete().eq('id', productId);
    loadAdminProducts();
    showToast('تم حذف المنتج', 'success');
}

function resetProductForm() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('productPreview').style.display = 'none';
    document.getElementById('submitBtn').textContent = 'إضافة المنتج';
    document.getElementById('cancelBtn').style.display = 'none';
}

async function loadOrders(status) {
    currentOrderFilter = status;
    const tbody = document.getElementById('ordersTable');
    if (!tbody) return;
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (status !== 'all') query = query.eq('status', status);
    const { data: orders, error } = await query;
    if (error) { console.error(error); return; }
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px;">لا توجد طلبات</td></tr>';
        return;
    }
    tbody.innerHTML = orders.map(o => {
        const itemsText = Array.isArray(o.items) ? o.items.map(i => `${i.name} (x${i.quantity})`).join(', ') : '';
        const statusClass = { pending: 'status-pending', completed: 'status-completed', cancelled: 'status-cancelled', returned: 'status-returned' }[o.status] || 'status-pending';
        const statusText = { pending: 'معلق', completed: 'تم', cancelled: 'ملغي', returned: 'مرتجع' }[o.status] || 'معلق';
        const date = o.created_at ? new Date(o.created_at).toLocaleDateString('ar-DZ') : '-';
        return `
            <tr>
                <td>${o.order_id}</td>
                <td>${o.customer_name}</td>
                <td>${o.customer_phone}</td>
                <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${itemsText}</td>
                <td>${parseFloat(o.total).toFixed(2)} د.ج</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${date}</td>
                <td>
                    <select onchange="changeOrderStatus('${o.order_id}', this.value)" style="background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border-color);padding:6px;font-family:'Cairo',sans-serif;">
                        <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>معلق</option>
                        <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>تم</option>
                        <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
                        <option value="returned" ${o.status === 'returned' ? 'selected' : ''}>مرتجع</option>
                    </select>
                </td>
            </tr>
        `;
    }).join('');
}

function filterOrders(status) {
    const btn = event.target;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadOrders(status);
}

async function changeOrderStatus(orderId, status) {
    await supabase.from('orders').update({ status }).eq('order_id', orderId);
    const statusNames = { pending: 'معلق', completed: 'تم', cancelled: 'ملغي', returned: 'مرتجع' };
    showToast(`تم تغيير حالة الطلب إلى: ${statusNames[status]}`, 'success');
    loadOrders(currentOrderFilter);
    loadDashboard();
    loadEarnings();
}

async function loadEarnings() {
    const { data: completed } = await supabase.from('orders').select('*').eq('status', 'completed');
    const orders = completed || [];
    const totalEarnings = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    const now = new Date();
    const monthOrders = orders.filter(o => {
        if (!o.created_at) return false;
        const d = new Date(o.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthEarnings = monthOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    
    document.getElementById('totalEarnings').textContent = totalEarnings.toFixed(2) + ' د.ج';
    document.getElementById('monthEarnings').textContent = monthEarnings.toFixed(2) + ' د.ج';
    document.getElementById('completedOrders').textContent = orders.length;
    
    const tbody = document.getElementById('monthlyEarningsTable');
    if (!tbody) return;
    const months = {};
    orders.forEach(o => {
        if (!o.created_at) return;
        const d = new Date(o.created_at);
        const key = d.toLocaleString('ar-DZ', { year: 'numeric', month: 'long' });
        if (!months[key]) months[key] = { month: key, orders: 0, total: 0 };
        months[key].orders++;
        months[key].total += parseFloat(o.total) || 0;
    });
    const monthly = Object.values(months).sort((a, b) => b.total - a.total);
    if (monthly.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:32px;">لا توجد أرباح بعد</td></tr>';
        return;
    }
    tbody.innerHTML = monthly.map(m => `
        <tr><td>${m.month}</td><td>${m.orders}</td><td>${m.total.toFixed(2)} د.ج</td><td style="color:var(--success);font-weight:700;">${m.total.toFixed(2)} د.ج</td></tr>
    `).join('');
}

async function renderSlider() {
    const container = document.getElementById('sliderContainer');
    const dotsContainer = document.getElementById('sliderDots');
    if (!container) return;
    const { data: slides, error } = await supabase.from('slider').select('*').order('sort_order', { ascending: true });
    if (error || !slides || slides.length === 0) {
        container.innerHTML = '';
        if (dotsContainer) dotsContainer.innerHTML = '';
        return;
    }
    container.innerHTML = slides.map((s, i) => `
        <div class="slide" data-index="${i}">
            <img src="${s.image_url}" alt="${s.title}" onerror="this.src='https://via.placeholder.com/1200x500/1a1a1a/666?text=Slide'">
            <div class="slide-content">
                <h2>${s.title}</h2>
                ${s.link_url ? `<a href="${s.link_url}" class="btn btn-primary">تصفح الآن</a>` : ''}
            </div>
        </div>
    `).join('');
    if (dotsContainer) {
        dotsContainer.innerHTML = slides.map((_, i) => `
            <button class="slider-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></button>
        `).join('');
    }
    currentSlide = 0;
    startSlider();
}

function startSlider() {
    if (sliderInterval) clearInterval(sliderInterval);
    sliderInterval = setInterval(() => {
        const dots = document.querySelectorAll('.slider-dot');
        if (dots.length === 0) return;
        currentSlide = (currentSlide + 1) % dots.length;
        updateSliderPosition();
    }, 5000);
}

function goToSlide(index) {
    currentSlide = index;
    updateSliderPosition();
    if (sliderInterval) { clearInterval(sliderInterval); startSlider(); }
}

function updateSliderPosition() {
    const container = document.getElementById('sliderContainer');
    if (container) container.style.transform = `translateX(${currentSlide * 100}%)`;
    document.querySelectorAll('.slider-dot').forEach((d, i) => d.classList.toggle('active', i === currentSlide));
}

async function loadSliderAdmin() {
    const grid = document.getElementById('sliderPreviewGrid');
    if (!grid) return;
    const { data: slides, error } = await supabase.from('slider').select('*').order('sort_order', { ascending: true });
    if (error || !slides || slides.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:32px;">لا توجد سلايدات</p>';
        return;
    }
    grid.innerHTML = slides.map(s => `
        <div class="slide-preview-card">
            <img src="${s.image_url}" alt="${s.title}" onerror="this.src='https://via.placeholder.com/300x160/1a1a1a/666?text=No+Image'">
            <div class="slide-preview-info">
                <h4>${s.title}</h4>
                <p style="color:var(--text-muted);font-size:0.85rem;">الترتيب: ${s.sort_order}</p>
                <div class="slide-preview-actions">
                    <button class="btn btn-edit" onclick="editSlider(${s.id})">تعديل</button>
                    <button class="btn btn-danger" onclick="deleteSlider(${s.id})">حذف</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function handleSliderSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('slideId').value;
    const title = document.getElementById('slideTitle').value.trim();
    const linkUrl = document.getElementById('slideLink').value.trim();
    const sortOrder = parseInt(document.getElementById('slideOrder').value) || 1;
    const imageFile = document.getElementById('slideImageFile').files[0];
    const existingImage = document.getElementById('slideImage').value;
    if (!title) { showToast('يرجى إدخال عنوان السلايد', 'error'); return; }
    
    const btn = document.getElementById('slideSubmitBtn');
    btn.disabled = true;
    btn.textContent = id ? 'جاري الحفظ...' : 'جاري الإضافة...';
    
    let imageUrl = existingImage;
    if (imageFile) imageUrl = await uploadImage(imageFile, 'slider');
    if (!imageUrl && !id) { showToast('يرجى اختيار صورة', 'error'); btn.disabled = false; btn.textContent = id ? 'حفظ التعديلات' : 'إضافة سلايد'; return; }
    
    const data = { title, link_url: linkUrl, sort_order: sortOrder };
    if (imageUrl) data.image_url = imageUrl;
    
    if (id) {
        const { error } = await supabase.from('slider').update(data).eq('id', id);
        if (!error) showToast('تم تعديل السلايد بنجاح', 'success');
    } else {
        const { error } = await supabase.from('slider').insert([data]);
        if (!error) showToast('تمت إضافة السلايد بنجاح', 'success');
    }
    loadSliderAdmin();
    resetSliderForm();
    btn.disabled = false;
    btn.textContent = id ? 'حفظ التعديلات' : 'إضافة سلايد';
}

async function editSlider(id) {
    const { data: s, error } = await supabase.from('slider').select('*').eq('id', id).single();
    if (error || !s) return;
    document.getElementById('slideId').value = id;
    document.getElementById('slideTitle').value = s.title;
    document.getElementById('slideLink').value = s.link_url || '';
    document.getElementById('slideOrder').value = s.sort_order || 1;
    document.getElementById('slideImage').value = s.image_url || '';
    const preview = document.getElementById('slidePreview');
    if (s.image_url) { preview.src = s.image_url; preview.style.display = 'block'; }
    else preview.style.display = 'none';
    document.getElementById('slideSubmitBtn').textContent = 'حفظ التعديلات';
    document.getElementById('slideCancelBtn').style.display = 'inline-flex';
}

async function deleteSlider(id) {
    if (!confirm('هل أنت متأكد من حذف هذا السلايد؟')) return;
    await supabase.from('slider').delete().eq('id', id);
    loadSliderAdmin();
    showToast('تم حذف السلايد', 'success');
}

function resetSliderForm() {
    document.getElementById('sliderForm').reset();
    document.getElementById('slideId').value = '';
    document.getElementById('slideImage').value = '';
    document.getElementById('slidePreview').style.display = 'none';
    document.getElementById('slideSubmitBtn').textContent = 'إضافة سلايد';
    document.getElementById('slideCancelBtn').style.display = 'none';
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('store_settings') || '{}');
    if (document.getElementById('emailjsKey')) document.getElementById('emailjsKey').value = settings.emailjs_key || '';
    if (document.getElementById('emailjsService')) document.getElementById('emailjsService').value = settings.emailjs_service || '';
    if (document.getElementById('emailjsTemplate')) document.getElementById('emailjsTemplate').value = settings.emailjs_template || '';
    if (document.getElementById('sheetsUrl')) document.getElementById('sheetsUrl').value = settings.sheets_url || '';
    const theme = JSON.parse(localStorage.getItem('store_theme') || '{}');
    if (theme.bg && document.getElementById('bgColor')) document.getElementById('bgColor').value = theme.bg;
    if (theme.text && document.getElementById('textColor')) document.getElementById('textColor').value = theme.text;
    if (theme.btn && document.getElementById('btnColor')) document.getElementById('btnColor').value = theme.btn;
    if (theme.bgSecondary && document.getElementById('bgSecondary')) document.getElementById('bgSecondary').value = theme.bgSecondary;
}

function saveSettings() {
    const settings = {
        emailjs_key: document.getElementById('emailjsKey')?.value.trim() || '',
        emailjs_service: document.getElementById('emailjsService')?.value.trim() || '',
        emailjs_template: document.getElementById('emailjsTemplate')?.value.trim() || '',
        sheets_url: document.getElementById('sheetsUrl')?.value.trim() || ''
    };
    localStorage.setItem('store_settings', JSON.stringify(settings));
    showToast('تم حفظ الإعدادات', 'success');
}

function updateTheme() {
    const bg = document.getElementById('bgColor')?.value || '#0a0a0a';
    const text = document.getElementById('textColor')?.value || '#ffffff';
    const btn = document.getElementById('btnColor')?.value || '#ffffff';
    const bgSecondary = document.getElementById('bgSecondary')?.value || '#111111';
    document.documentElement.style.setProperty('--bg-primary', bg);
    document.documentElement.style.setProperty('--bg-secondary', bgSecondary);
    document.documentElement.style.setProperty('--text-primary', text);
    document.documentElement.style.setProperty('--accent', btn);
}

function saveTheme() {
    const theme = {
        bg: document.getElementById('bgColor')?.value || '#0a0a0a',
        text: document.getElementById('textColor')?.value || '#ffffff',
        btn: document.getElementById('btnColor')?.value || '#ffffff',
        bgSecondary: document.getElementById('bgSecondary')?.value || '#111111'
    };
    localStorage.setItem('store_theme', JSON.stringify(theme));
    showToast('تم حفظ الألوان', 'success');
}

function resetTheme() {
    const defaults = { bg: '#0a0a0a', text: '#ffffff', btn: '#ffffff', bgSecondary: '#111111' };
    if (document.getElementById('bgColor')) document.getElementById('bgColor').value = defaults.bg;
    if (document.getElementById('textColor')) document.getElementById('textColor').value = defaults.text;
    if (document.getElementById('btnColor')) document.getElementById('btnColor').value = defaults.btn;
    if (document.getElementById('bgSecondary')) document.getElementById('bgSecondary').value = defaults.bgSecondary;
    updateTheme();
    localStorage.setItem('store_theme', JSON.stringify(defaults));
    showToast('تمت إعادة الألوان الافتراضية', 'success');
}

function loadTheme() {
    const theme = JSON.parse(localStorage.getItem('store_theme') || '{}');
    if (theme.bg) document.documentElement.style.setProperty('--bg-primary', theme.bg);
    if (theme.bgSecondary) document.documentElement.style.setProperty('--bg-secondary', theme.bgSecondary);
    if (theme.text) document.documentElement.style.setProperty('--text-primary', theme.text);
    if (theme.btn) document.documentElement.style.setProperty('--accent', theme.btn);
}

function showToast(message, type) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
}
