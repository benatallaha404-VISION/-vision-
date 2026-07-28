/* ========================================
   متجرك - Firebase Edition
   Firestore + Storage + Auth + EmailJS + Sheets
   العملة: الدينار الجزائري (د.ج)
   ======================================== */

const firebaseConfig = {
    apiKey: "AIzaSyBm-lTuPfHYDEK6jwhhhm3J0Hiy73GrR-g",
    authDomain: "vision-5d2d8.firebaseapp.com",
    databaseURL: "https://vision-5d2d8-default-rtdb.firebaseio.com",
    projectId: "vision-5d2d8",
    storageBucket: "vision-5d2d8.firebasestorage.app",
    messagingSenderId: "840448843688",
    appId: "1:840448843688:web:80c3ae799d6797ac57c79d"
};

let db = null;
let auth = null;
let storage = null;
let currentQty = 1;
let sliderInterval = null;
let currentSlide = 0;
let currentOrderFilter = 'all';

// ==================== تهيئة Firebase ====================
function initFirebase() {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    auth = firebase.auth();
    storage = firebase.storage();
    console.log("✅ Firebase initialized successfully");
}

// ==================== تسجيل الدخول / الخروج ====================
function loginAdmin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    const errorEl = document.getElementById('loginError');

    if (!email || !password) {
        if (errorEl) {
            errorEl.textContent = 'يرجى ملء جميع الحقول';
            errorEl.classList.add('show');
        }
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'جاري الدخول...';
    }
    if (errorEl) errorEl.classList.remove('show');

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            window.location.replace('admin.html');
        })
        .catch(err => {
            console.error('Login error:', err);
            let msg = 'خطأ في البريد أو كلمة المرور';
            if (err.code === 'auth/invalid-api-key') msg = '⚠️ مفتاح Firebase API غير صحيح';
            else if (err.code === 'auth/user-not-found') msg = 'هذا البريد غير مسجل';
            else if (err.code === 'auth/wrong-password') msg = 'كلمة المرور خاطئة';
            else if (err.code === 'auth/invalid-email') msg = 'البريد الإلكتروني غير صالح';
            else if (err.code === 'auth/too-many-requests') msg = 'تم حظر المحاولات مؤقتاً';
            else if (err.code === 'auth/network-request-failed') msg = 'مشكلة في الاتصال بالإنترنت';
            else if (err.code === 'auth/configuration-not-found') msg = '⚠️ لم تُفعّل Email/Password في Firebase Authentication';
            
            if (errorEl) {
                errorEl.textContent = msg;
                errorEl.classList.add('show');
            }
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'دخول';
            }
        });
}

function logoutAdmin() {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    });
}

// ==================== رفع الصور ====================
async function uploadImage(file, folder) {
    if (!file) return null;
    const ref = storage.ref(`${folder}/${Date.now()}_${file.name}`);
    await ref.put(file);
    return await ref.getDownloadURL();
}

function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// ==================== المنتجات ====================
async function displayProducts() {
    const grid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    const countEl = document.getElementById('productsCount');
    if (!grid) return;
    
    const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    try {
        const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
        let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (query) {
            products = products.filter(p => 
                p.name.toLowerCase().includes(query) || 
                (p.category && p.category.toLowerCase().includes(query))
            );
        }
        
        if (products.length === 0) {
            grid.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            if (countEl) countEl.textContent = 'لا توجد منتجات';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        if (countEl) countEl.textContent = `${products.length} منتج`;
        
        grid.innerHTML = products.map(p => `
            <div class="product-card" onclick="goToProduct('${p.id}')">
                <img src="${p.image || 'https://via.placeholder.com/400x400/1a1a1a/666?text=No+Image'}" 
                     alt="${p.name}" class="product-image" onerror="this.src='https://via.placeholder.com/400x400/1a1a1a/666?text=No+Image'">
                <div class="product-info">
                    <div class="product-category">${p.category || 'عام'}</div>
                    <h3 class="product-name">${p.name}</h3>
                    <div class="product-price">${parseFloat(p.price).toFixed(2)} د.ج</div>
                    <div class="product-actions" onclick="event.stopPropagation()">
                        <button class="btn btn-primary" onclick="addToCart('${p.id}')">أضف للسلة</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Error loading products:', e);
    }
}

function searchProducts() {
    displayProducts();
}

function goToProduct(productId) {
    window.location.href = `product.html?id=${productId}`;
}

async function displayProductDetail() {
    const container = document.getElementById('productDetail');
    if (!container) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    try {
        const doc = await db.collection('products').doc(productId).get();
        if (!doc.exists) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>المنتج غير موجود</p>
                    <a href="index.html" class="btn btn-primary">العودة للرئيسية</a>
                </div>
            `;
            return;
        }
        
        const p = doc.data();
        window.currentProductPrice = parseFloat(p.price);
        
        container.innerHTML = `
            <img src="${p.image || 'https://via.placeholder.com/600x600/1a1a1a/666?text=No+Image'}" 
                 alt="${p.name}" class="product-detail-image" onerror="this.src='https://via.placeholder.com/600x600/1a1a1a/666?text=No+Image'">
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
                <button class="btn btn-primary" onclick="addToCart('${productId}', getQty())" style="width:auto;">
                    أضف للسلة - <span id="btnTotal">${parseFloat(p.price).toFixed(2)}</span> د.ج
                </button>
            </div>
        `;
    } catch (e) {
        console.error('Error loading product:', e);
    }
}

function changeQty(delta) {
    currentQty = Math.max(1, currentQty + delta);
    const qtyEl = document.getElementById('qtyValue');
    const btnTotal = document.getElementById('btnTotal');
    if (qtyEl) qtyEl.textContent = currentQty;
    if (btnTotal && window.currentProductPrice) {
        btnTotal.textContent = (currentQty * window.currentProductPrice).toFixed(2);
    }
}

function getQty() { return currentQty; }

// ==================== السلة ====================
function getCart() {
    return JSON.parse(localStorage.getItem('store_cart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('store_cart', JSON.stringify(cart));
}

async function addToCart(productId, quantity = 1) {
    try {
        const doc = await db.collection('products').doc(productId).get();
        if (!doc.exists) return;
        const product = doc.data();
        
        let cart = getCart();
        const existing = cart.find(item => item.id === productId);
        
        if (existing) {
            existing.quantity += quantity;
        } else {
            cart.push({
                id: productId,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: quantity
            });
        }
        
        saveCart(cart);
        updateCartCount();
        showToast('تمت الإضافة للسلة بنجاح', 'success');
    } catch (e) {
        console.error('Error adding to cart:', e);
    }
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
        container.innerHTML = `
            <div class="empty-state">
                <p>السلة فارغة</p>
                <a href="index.html" class="btn btn-primary">تسوق الآن</a>
            </div>
        `;
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
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    displayCart();
    updateCartCount();
    showToast('تم الحذف من السلة', 'success');
}

// ==================== إتمام الطلب ====================
async function handleCheckout(e) {
    e.preventDefault();
    
    const cart = getCart();
    if (cart.length === 0) {
        showToast('السلة فارغة!', 'error');
        return;
    }
    
    const btn = document.getElementById('submitOrder');
    btn.disabled = true;
    btn.textContent = 'جاري إرسال الطلب...';
    
    const orderData = {
        orderId: 'ORD-' + Date.now(),
        customerName: document.getElementById('customerName').value.trim(),
        customerPhone: document.getElementById('customerPhone').value.trim(),
        customerEmail: document.getElementById('customerEmail').value.trim(),
        customerCity: document.getElementById('customerCity').value.trim(),
        customerAddress: document.getElementById('customerAddress').value.trim(),
        orderNotes: document.getElementById('orderNotes')?.value.trim() || '',
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection('orders').doc(orderData.orderId).set(orderData);
        
        sendEmail(orderData);
        sendToGoogleSheets(orderData);
        
        saveCart([]);
        updateCartCount();
        
        showToast('تم إرسال طلبك بنجاح! سنتواصل معك قريباً', 'success');
        document.getElementById('checkoutForm').reset();
        displayCart();
    } catch (err) {
        console.error('Error saving order:', err);
        showToast('حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'تأكيد الطلب';
    }
}

function sendEmail(orderData) {
    const settings = JSON.parse(localStorage.getItem('store_settings') || '{}');
    if (!settings.emailjs_key) {
        console.log('⚠️ EmailJS غير مُهيأ');
        return;
    }
    
    try {
        emailjs.init(settings.emailjs_key);
        
        const templateParams = {
            to_email: orderData.customerEmail,
            to_name: orderData.customerName,
            order_id: orderData.orderId,
            order_details: orderData.items.map(i => `${i.name} x${i.quantity} - ${(i.price*i.quantity).toFixed(2)} د.ج`).join('\n'),
            order_total: orderData.total.toFixed(2) + ' د.ج',
            customer_phone: orderData.customerPhone,
            customer_address: `${orderData.customerCity} - ${orderData.customerAddress}`
        };
        
        emailjs.send(settings.emailjs_service, settings.emailjs_template, templateParams)
            .then(() => console.log('📧 Email sent'))
            .catch(err => console.error('Email error:', err));
    } catch (e) {
        console.error('EmailJS error:', e);
    }
}

function sendToGoogleSheets(orderData) {
    const settings = JSON.parse(localStorage.getItem('store_settings') || '{}');
    if (!settings.sheets_url) {
        console.log('⚠️ Google Sheets غير مُهيأ');
        return;
    }
    
    const payload = {
        orderId: orderData.orderId,
        name: orderData.customerName,
        phone: orderData.customerPhone,
        email: orderData.customerEmail,
        city: orderData.customerCity,
        address: orderData.customerAddress,
        items: orderData.items.map(i => `${i.name}(x${i.quantity})`).join(', '),
        total: orderData.total,
        date: new Date().toLocaleString('ar-DZ'),
        notes: orderData.orderNotes
    };
    
    fetch(settings.sheets_url, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors'
    })
    .then(() => console.log('📊 Sent to Google Sheets'))
    .catch(err => console.error('Sheets error:', err));
}

// ==================== لوحة التحكم ====================
function showSection(sectionId, linkEl) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.getElementById('sec-' + sectionId)?.classList.add('active');
    
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    if (linkEl) linkEl.classList.add('active');
    
    const titles = {
        dashboard: 'لوحة المعلومات',
        products: 'إدارة المنتجات',
        orders: 'إدارة الطلبات',
        earnings: 'الأرباح',
        slider: 'إدارة السلايدر',
        settings: 'الإعدادات'
    };
    document.getElementById('pageTitle').textContent = titles[sectionId] || '';
    
    if (sectionId === 'dashboard') loadDashboard();
    if (sectionId === 'products') loadAdminProducts();
    if (sectionId === 'orders') loadOrders('all');
    if (sectionId === 'earnings') loadEarnings();
    if (sectionId === 'slider') loadSliderAdmin();
    if (sectionId === 'settings') loadSettings();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ==================== Dashboard ====================
async function loadDashboard() {
    try {
        const [productsSnap, ordersSnap] = await Promise.all([
            db.collection('products').get(),
            db.collection('orders').get()
        ]);
        
        const products = productsSnap.docs.length;
        const orders = ordersSnap.docs.map(d => d.data());
        const pending = orders.filter(o => o.status === 'pending').length;
        const completed = orders.filter(o => o.status === 'completed');
        const totalEarnings = completed.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
        
        document.getElementById('statProducts').textContent = products;
        document.getElementById('statOrders').textContent = orders.length;
        document.getElementById('statPending').textContent = pending;
        document.getElementById('statEarnings').textContent = totalEarnings.toFixed(2) + ' د.ج';
        
        const tbody = document.getElementById('recentOrdersTable');
        if (!tbody) return;
        
        const recent = orders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 5);
        
        if (recent.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:32px;">لا توجد طلبات بعد</td></tr>';
            return;
        }
        
        tbody.innerHTML = recent.map(o => {
            const statusClass = {
                pending: 'status-pending',
                completed: 'status-completed',
                cancelled: 'status-cancelled',
                returned: 'status-returned'
            }[o.status] || 'status-pending';
            
            const statusText = {
                pending: 'معلق',
                completed: 'تم',
                cancelled: 'ملغي',
                returned: 'مرتجع'
            }[o.status] || 'معلق';
            
            const date = o.createdAt ? new Date(o.createdAt.seconds * 1000).toLocaleDateString('ar-DZ') : '-';
            
            return `
                <tr>
                    <td>${o.orderId}</td>
                    <td>${o.customerName}</td>
                    <td>${parseFloat(o.total).toFixed(2)} د.ج</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>${date}</td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error('Dashboard error:', e);
    }
}

// ==================== المنتجات في الأدمن ====================
async function loadAdminProducts() {
    const tbody = document.getElementById('productsTable');
    const badge = document.getElementById('totalProductsBadge');
    if (!tbody) return;
    
    try {
        const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (badge) badge.textContent = products.length + ' منتج';
        
        if (products.length === 0) {
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
                    <button class="btn btn-edit" onclick="editProduct('${p.id}')">تعديل</button>
                    <button class="btn btn-danger" onclick="deleteProductAdmin('${p.id}')">حذف</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Admin products error:', e);
    }
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
    
    if (!name || isNaN(price)) {
        showToast('يرجى ملء الحقول المطلوبة', 'error');
        return;
    }
    
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = id ? 'جاري الحفظ...' : 'جاري الإضافة...';
    
    try {
        let imageUrl = existingImage;
        if (imageFile) {
            imageUrl = await uploadImage(imageFile, 'products');
        }
        
        const data = {
            name, price, category, stock, image: imageUrl, description,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (id) {
            await db.collection('products').doc(id).update(data);
            showToast('تم تعديل المنتج بنجاح', 'success');
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('products').add(data);
            showToast('تمت إضافة المنتج بنجاح', 'success');
        }
        
        loadAdminProducts();
        resetProductForm();
    } catch (err) {
        console.error('Product error:', err);
        showToast('حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = id ? 'حفظ التعديلات' : 'إضافة المنتج';
    }
}

async function editProduct(productId) {
    try {
        const doc = await db.collection('products').doc(productId).get();
        if (!doc.exists) return;
        const p = doc.data();
        
        document.getElementById('productId').value = productId;
        document.getElementById('productName').value = p.name;
        document.getElementById('productPrice').value = p.price;
        document.getElementById('productCategory').value = p.category || '';
        document.getElementById('productStock').value = p.stock || 0;
        document.getElementById('productImage').value = p.image || '';
        document.getElementById('productDesc').value = p.description || '';
        
        const preview = document.getElementById('productPreview');
        if (p.image) {
            preview.src = p.image;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
        
        document.getElementById('submitBtn').textContent = 'حفظ التعديلات';
        document.getElementById('cancelBtn').style.display = 'inline-flex';
        
        document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Edit product error:', e);
    }
}

async function deleteProductAdmin(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    try {
        await db.collection('products').doc(productId).delete();
        loadAdminProducts();
        showToast('تم حذف المنتج', 'success');
    } catch (e) {
        console.error('Delete product error:', e);
    }
}

function resetProductForm() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('productPreview').style.display = 'none';
    document.getElementById('submitBtn').textContent = 'إضافة المنتج';
    document.getElementById('cancelBtn').style.display = 'none';
}

// ==================== الطلبات ====================
async function loadOrders(status) {
    currentOrderFilter = status;
    const tbody = document.getElementById('ordersTable');
    if (!tbody) return;
    
    try {
        let query = db.collection('orders').orderBy('createdAt', 'desc');
        if (status !== 'all') query = query.where('status', '==', status);
        
        const snapshot = await query.get();
        const orders = snapshot.docs.map(doc => doc.data());
        
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px;">لا توجد طلبات</td></tr>';
            return;
        }
        
        tbody.innerHTML = orders.map(o => {
            const itemsText = Array.isArray(o.items) 
                ? o.items.map(i => `${i.name} (x${i.quantity})`).join(', ')
                : '';
            
            const statusClass = {
                pending: 'status-pending',
                completed: 'status-completed',
                cancelled: 'status-cancelled',
                returned: 'status-returned'
            }[o.status] || 'status-pending';
            
            const statusText = {
                pending: 'معلق',
                completed: 'تم',
                cancelled: 'ملغي',
                returned: 'مرتجع'
            }[o.status] || 'معلق';
            
            const date = o.createdAt ? new Date(o.createdAt.seconds * 1000).toLocaleDateString('ar-DZ') : '-';
            
            return `
                <tr>
                    <td>${o.orderId}</td>
                    <td>${o.customerName}</td>
                    <td>${o.customerPhone}</td>
                    <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${itemsText}</td>
                    <td>${parseFloat(o.total).toFixed(2)} د.ج</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>${date}</td>
                    <td>
                        <select onchange="changeOrderStatus('${o.orderId}', this.value)" style="background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border-color);padding:6px;font-family:'Cairo',sans-serif;">
                            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>معلق</option>
                            <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>تم</option>
                            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
                            <option value="returned" ${o.status === 'returned' ? 'selected' : ''}>مرتجع</option>
                        </select>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error('Orders error:', e);
    }
}

function filterOrders(status) {
    const btn = event.target;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadOrders(status);
}

async function changeOrderStatus(orderId, status) {
    try {
        await db.collection('orders').doc(orderId).update({ status: status });
        const statusNames = { pending: 'معلق', completed: 'تم', cancelled: 'ملغي', returned: 'مرتجع' };
        showToast(`تم تغيير حالة الطلب إلى: ${statusNames[status]}`, 'success');
        loadOrders(currentOrderFilter);
        loadDashboard();
        loadEarnings();
    } catch (e) {
        console.error('Status change error:', e);
    }
}

// ==================== الأرباح ====================
async function loadEarnings() {
    const totalEl = document.getElementById('totalEarnings');
    const monthEl = document.getElementById('monthEarnings');
    const completedEl = document.getElementById('completedOrders');
    const tbody = document.getElementById('monthlyEarningsTable');
    
    try {
        const snapshot = await db.collection('orders').where('status', '==', 'completed').get();
        const completed = snapshot.docs.map(d => d.data());
        
        const totalEarnings = completed.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const monthOrders = completed.filter(o => {
            if (!o.createdAt) return false;
            const d = new Date(o.createdAt.seconds * 1000);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        const monthEarnings = monthOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
        
        if (totalEl) totalEl.textContent = totalEarnings.toFixed(2) + ' د.ج';
        if (monthEl) monthEl.textContent = monthEarnings.toFixed(2) + ' د.ج';
        if (completedEl) completedEl.textContent = completed.length;
        
        if (!tbody) return;
        
        const months = {};
        completed.forEach(o => {
            if (!o.createdAt) return;
            const d = new Date(o.createdAt.seconds * 1000);
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
            <tr>
                <td>${m.month}</td>
                <td>${m.orders}</td>
                <td>${m.total.toFixed(2)} د.ج</td>
                <td style="color:var(--success);font-weight:700;">${m.total.toFixed(2)} د.ج</td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Earnings error:', e);
    }
}

// ==================== السلايدر ====================
async function renderSlider() {
    const container = document.getElementById('sliderContainer');
    const dotsContainer = document.getElementById('sliderDots');
    if (!container) return;
    
    try {
        const snapshot = await db.collection('slider').orderBy('sortOrder', 'asc').get();
        const slides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (slides.length === 0) {
            container.innerHTML = '';
            if (dotsContainer) dotsContainer.innerHTML = '';
            return;
        }
        
        container.innerHTML = slides.map((s, i) => `
            <div class="slide" data-index="${i}">
                <img src="${s.imageUrl}" alt="${s.title}" onerror="this.src='https://via.placeholder.com/1200x500/1a1a1a/666?text=Slide'">
                <div class="slide-content">
                    <h2>${s.title}</h2>
                    ${s.linkUrl ? `<a href="${s.linkUrl}" class="btn btn-primary">تصفح الآن</a>` : ''}
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
    } catch (e) {
        console.error('Slider error:', e);
    }
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
    if (sliderInterval) {
        clearInterval(sliderInterval);
        startSlider();
    }
}

function updateSliderPosition() {
    const container = document.getElementById('sliderContainer');
    if (container) container.style.transform = `translateX(${currentSlide * 100}%)`;
    document.querySelectorAll('.slider-dot').forEach((d, i) => {
        d.classList.toggle('active', i === currentSlide);
    });
}

async function loadSliderAdmin() {
    const grid = document.getElementById('sliderPreviewGrid');
    if (!grid) return;
    
    try {
        const snapshot = await db.collection('slider').orderBy('sortOrder', 'asc').get();
        const slides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (slides.length === 0) {
            grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:32px;">لا توجد سلايدات</p>';
            return;
        }
        
        grid.innerHTML = slides.map(s => `
            <div class="slide-preview-card">
                <img src="${s.imageUrl}" alt="${s.title}" onerror="this.src='https://via.placeholder.com/300x160/1a1a1a/666?text=No+Image'">
                <div class="slide-preview-info">
                    <h4>${s.title}</h4>
                    <p style="color:var(--text-muted);font-size:0.85rem;">الترتيب: ${s.sortOrder}</p>
                    <div class="slide-preview-actions">
                        <button class="btn btn-edit" onclick="editSlider('${s.id}')">تعديل</button>
                        <button class="btn btn-danger" onclick="deleteSlider('${s.id}')">حذف</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Slider admin error:', e);
    }
}

async function handleSliderSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('slideId').value;
    const title = document.getElementById('slideTitle').value.trim();
    const linkUrl = document.getElementById('slideLink').value.trim();
    const sortOrder = parseInt(document.getElementById('slideOrder').value) || 1;
    const imageFile = document.getElementById('slideImageFile').files[0];
    const existingImage = document.getElementById('slideImage').value;
    
    if (!title) {
        showToast('يرجى إدخال عنوان السلايد', 'error');
        return;
    }
    
    const btn = document.getElementById('slideSubmitBtn');
    btn.disabled = true;
    btn.textContent = id ? 'جاري الحفظ...' : 'جاري الإضافة...';
    
    try {
        let imageUrl = existingImage;
        if (imageFile) {
            imageUrl = await uploadImage(imageFile, 'slider');
        }
        
        if (!imageUrl && !id) {
            showToast('يرجى اختيار صورة', 'error');
            btn.disabled = false;
            btn.textContent = id ? 'حفظ التعديلات' : 'إضافة سلايد';
            return;
        }
        
        const data = { title, linkUrl, sortOrder, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        if (imageUrl) data.imageUrl = imageUrl;
        
        if (id) {
            await db.collection('slider').doc(id).update(data);
            showToast('تم تعديل السلايد بنجاح', 'success');
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('slider').add(data);
            showToast('تمت إضافة السلايد بنجاح', 'success');
        }
        
        loadSliderAdmin();
        resetSliderForm();
    } catch (err) {
        console.error('Slider submit error:', err);
        showToast('حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = id ? 'حفظ التعديلات' : 'إضافة سلايد';
    }
}

async function editSlider(id) {
    try {
        const doc = await db.collection('slider').doc(id).get();
        if (!doc.exists) return;
        const s = doc.data();
        
        document.getElementById('slideId').value = id;
        document.getElementById('slideTitle').value = s.title;
        document.getElementById('slideLink').value = s.linkUrl || '';
        document.getElementById('slideOrder').value = s.sortOrder || 1;
        document.getElementById('slideImage').value = s.imageUrl || '';
        
        const preview = document.getElementById('slidePreview');
        if (s.imageUrl) {
            preview.src = s.imageUrl;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
        
        document.getElementById('slideSubmitBtn').textContent = 'حفظ التعديلات';
        document.getElementById('slideCancelBtn').style.display = 'inline-flex';
    } catch (e) {
        console.error('Edit slider error:', e);
    }
}

async function deleteSlider(id) {
    if (!confirm('هل أنت متأكد من حذف هذا السلايد؟')) return;
    try {
        await db.collection('slider').doc(id).delete();
        loadSliderAdmin();
        showToast('تم حذف السلايد', 'success');
    } catch (e) {
        console.error('Delete slider error:', e);
    }
}

function resetSliderForm() {
    document.getElementById('sliderForm').reset();
    document.getElementById('slideId').value = '';
    document.getElementById('slideImage').value = '';
    document.getElementById('slidePreview').style.display = 'none';
    document.getElementById('slideSubmitBtn').textContent = 'إضافة سلايد';
    document.getElementById('slideCancelBtn').style.display = 'none';
}

// ==================== الإعدادات والألوان ====================
function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('store_settings') || '{}');
    const elKey = document.getElementById('emailjsKey');
    const elService = document.getElementById('emailjsService');
    const elTemplate = document.getElementById('emailjsTemplate');
    const elSheets = document.getElementById('sheetsUrl');
    
    if (elKey) elKey.value = settings.emailjs_key || '';
    if (elService) elService.value = settings.emailjs_service || '';
    if (elTemplate) elTemplate.value = settings.emailjs_template || '';
    if (elSheets) elSheets.value = settings.sheets_url || '';
    
    const theme = JSON.parse(localStorage.getItem('store_theme') || '{}');
    const elBg = document.getElementById('bgColor');
    const elText = document.getElementById('textColor');
    const elBtn = document.getElementById('btnColor');
    const elBgSec = document.getElementById('bgSecondary');
    
    if (theme.bg && elBg) elBg.value = theme.bg;
    if (theme.text && elText) elText.value = theme.text;
    if (theme.btn && elBtn) elBtn.value = theme.btn;
    if (theme.bgSecondary && elBgSec) elBgSec.value = theme.bgSecondary;
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
    const elBg = document.getElementById('bgColor');
    const elText = document.getElementById('textColor');
    const elBtn = document.getElementById('btnColor');
    const elBgSec = document.getElementById('bgSecondary');
    
    if (elBg) elBg.value = defaults.bg;
    if (elText) elText.value = defaults.text;
    if (elBtn) elBtn.value = defaults.btn;
    if (elBgSec) elBgSec.value = defaults.bgSecondary;
    
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

// ==================== Toast ====================
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}
