/* ========================================
   متجرك - الجافاسكريبت الكامل
   SQLite Database + EmailJS + Google Sheets
   ======================================== */

let db = null;
let currentQty = 1;
let sliderInterval = null;
let currentSlide = 0;

// ==================== تهيئة قاعدة البيانات SQLite ====================
async function initDatabase() {
    if (db) return;
    
    const SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });
    
    const saved = localStorage.getItem('store_db');
    if (saved) {
        const uint8Array = new Uint8Array(JSON.parse(saved));
        db = new SQL.Database(uint8Array);
    } else {
        db = new SQL.Database();
        createTables();
        insertDemoData();
    }
}

function saveDb() {
    if (!db) return;
    const data = db.export();
    localStorage.setItem('store_db', JSON.stringify(Array.from(data)));
}

function createTables() {
    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            category TEXT,
            stock INTEGER DEFAULT 0,
            image TEXT,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT UNIQUE NOT NULL,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            customer_email TEXT,
            customer_city TEXT,
            customer_address TEXT,
            items TEXT NOT NULL,
            total REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS slider_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            image_url TEXT NOT NULL,
            link_url TEXT,
            sort_order INTEGER DEFAULT 1
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `);
    
    saveDb();
}

function insertDemoData() {
    const products = [
        ['سماعات لاسلكية فاخرة', 349.00, 'إلكترونيات', 15, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop', 'سماعات بلوتوث عالية الجودة مع إلغاء الضوضاء النشط وعمر بطارية يصل إلى 30 ساعة.'],
        ['ساعة يد ذكية', 599.00, 'إلكترونيات', 8, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop', 'تتبع اللياقة البدنية، قياس نبضات القلب، مقاومة للماء حتى 50 متر.'],
        ['حقيبة جلد طبيعي', 899.00, 'أزياء', 5, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop', 'حقيبة يد مصنوعة يدوياً من الجلد الطبيعي الإيطالي الفاخر.'],
        ['نظارة شمسية كلاسيكية', 450.00, 'أزياء', 12, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop', 'عدسات UV400 مع إطار معدني خفيف الوزن بتصميم كلاسيكي أنيق.']
    ];
    
    const stmt = db.prepare("INSERT INTO products (name, price, category, stock, image, description) VALUES (?, ?, ?, ?, ?, ?)");
    products.forEach(p => stmt.run(p));
    stmt.free();
    
    const slides = [
        ['تشكيلة جديدة 2026', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=500&fit=crop', null, 1],
        ['عروض حصرية', 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=500&fit=crop', null, 2],
        ['جودة تستحق الثقة', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=500&fit=crop', null, 3]
    ];
    
    const stmt2 = db.prepare("INSERT INTO slider_images (title, image_url, link_url, sort_order) VALUES (?, ?, ?, ?)");
    slides.forEach(s => stmt2.run(s));
    stmt2.free();
    
    saveDb();
}

// ==================== المنتجات ====================
function getProducts(search = '') {
    let sql = "SELECT * FROM products ORDER BY id DESC";
    let params = [];
    if (search) {
        sql = "SELECT * FROM products WHERE name LIKE ? OR category LIKE ? ORDER BY id DESC";
        params = [`%${search}%`, `%${search}%`];
    }
    const stmt = db.prepare(sql);
    if (params.length) params.forEach((p, i) => stmt.bind(p));
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}

function getProductById(id) {
    const stmt = db.prepare("SELECT * FROM products WHERE id = ?");
    stmt.bind([id]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row;
}

function addProduct(name, price, category, stock, image, description) {
    db.run("INSERT INTO products (name, price, category, stock, image, description) VALUES (?, ?, ?, ?, ?, ?)",
        [name, price, category, stock, image, description]);
    saveDb();
}

function updateProduct(id, name, price, category, stock, image, description) {
    db.run("UPDATE products SET name=?, price=?, category=?, stock=?, image=?, description=? WHERE id=?",
        [name, price, category, stock, image, description, id]);
    saveDb();
}

function deleteProduct(id) {
    db.run("DELETE FROM products WHERE id = ?", [id]);
    saveDb();
}

// ==================== الطلبات ====================
function addOrder(orderData) {
    db.run(`INSERT INTO orders (order_id, customer_name, customer_phone, customer_email, customer_city, customer_address, items, total, status, notes, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderData.orderId, orderData.customerName, orderData.customerPhone, orderData.customerEmail,
         orderData.customerCity, orderData.customerAddress, JSON.stringify(orderData.items),
         orderData.total, 'pending', orderData.notes, new Date().toISOString()]);
    saveDb();
}

function getOrders(status = 'all') {
    let sql = "SELECT * FROM orders ORDER BY id DESC";
    if (status !== 'all') sql = "SELECT * FROM orders WHERE status = ? ORDER BY id DESC";
    const stmt = db.prepare(sql);
    if (status !== 'all') stmt.bind([status]);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}

function updateOrderStatus(orderId, status) {
    db.run("UPDATE orders SET status = ? WHERE order_id = ?", [status, orderId]);
    saveDb();
}

function getOrderById(orderId) {
    const stmt = db.prepare("SELECT * FROM orders WHERE order_id = ?");
    stmt.bind([orderId]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row;
}

// ==================== السلايدر ====================
function getSliderImages() {
    const stmt = db.prepare("SELECT * FROM slider_images ORDER BY sort_order ASC");
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}

function addSliderImage(title, imageUrl, linkUrl, order) {
    db.run("INSERT INTO slider_images (title, image_url, link_url, sort_order) VALUES (?, ?, ?, ?)",
        [title, imageUrl, linkUrl, order]);
    saveDb();
}

function updateSliderImage(id, title, imageUrl, linkUrl, order) {
    db.run("UPDATE slider_images SET title=?, image_url=?, link_url=?, sort_order=? WHERE id=?",
        [title, imageUrl, linkUrl, order, id]);
    saveDb();
}

function deleteSliderImage(id) {
    db.run("DELETE FROM slider_images WHERE id = ?", [id]);
    saveDb();
}

// ==================== الإعدادات ====================
function getSetting(key) {
    const stmt = db.prepare("SELECT value FROM settings WHERE key = ?");
    stmt.bind([key]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row ? row.value : null;
}

function setSetting(key, value) {
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
    saveDb();
}

// ==================== عرض المنتجات ====================
function displayProducts() {
    const grid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    const countEl = document.getElementById('productsCount');
    if (!grid) return;
    
    const query = document.getElementById('searchInput')?.value || '';
    const products = getProducts(query);
    
    if (products.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        if (countEl) countEl.textContent = 'لا توجد منتجات';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    if (countEl) countEl.textContent = `${products.length} منتج`;
    
    grid.innerHTML = products.map(p => `
        <div class="product-card" onclick="goToProduct(${p.id})">
            <img src="${p.image || 'https://via.placeholder.com/400x400/1a1a1a/666?text=No+Image'}" 
                 alt="${p.name}" class="product-image" onerror="this.src='https://via.placeholder.com/400x400/1a1a1a/666?text=No+Image'">
            <div class="product-info">
                <div class="product-category">${p.category || 'عام'}</div>
                <h3 class="product-name">${p.name}</h3>
                <div class="product-price">${parseFloat(p.price).toFixed(2)} ريال</div>
                <div class="product-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-primary" onclick="addToCart(${p.id})">أضف للسلة</button>
                </div>
            </div>
        </div>
    `).join('');
}

function searchProducts() {
    displayProducts();
}

function goToProduct(productId) {
    window.location.href = `product.html?id=${productId}`;
}

// ==================== صفحة المنتج التفصيلية ====================
function displayProductDetail() {
    const container = document.getElementById('productDetail');
    if (!container) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const product = getProductById(productId);
    
    if (!product) {
        container.innerHTML = `
            <div class="empty-state">
                <p>المنتج غير موجود</p>
                <a href="index.html" class="btn btn-primary">العودة للرئيسية</a>
            </div>
        `;
        return;
    }
    
    window.currentProductPrice = parseFloat(product.price);
    
    container.innerHTML = `
        <img src="${product.image || 'https://via.placeholder.com/600x600/1a1a1a/666?text=No+Image'}" 
             alt="${product.name}" class="product-detail-image" onerror="this.src='https://via.placeholder.com/600x600/1a1a1a/666?text=No+Image'">
        <div class="product-detail-info">
            <div class="product-category">${product.category || 'عام'}</div>
            <h1>${product.name}</h1>
            <div class="product-detail-price">${parseFloat(product.price).toFixed(2)} ريال</div>
            <p class="product-detail-desc">${product.description || 'لا يوجد وصف'}</p>
            <div class="quantity-selector">
                <button onclick="changeQty(-1)">−</button>
                <span id="qtyValue">1</span>
                <button onclick="changeQty(1)">+</button>
            </div>
            <button class="btn btn-primary" onclick="addToCart(${product.id}, getQty())" style="width:auto;">
                أضف للسلة - <span id="btnTotal">${parseFloat(product.price).toFixed(2)}</span> ريال
            </button>
        </div>
    `;
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

function addToCart(productId, quantity = 1) {
    const product = getProductById(productId);
    if (!product) return;
    
    let cart = getCart();
    const existing = cart.find(item => item.id === productId);
    
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: quantity
        });
    }
    
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
        container.innerHTML = `
            <div class="empty-state">
                <p>السلة فارغة</p>
                <a href="index.html" class="btn btn-primary">تسوق الآن</a>
            </div>
        `;
        document.getElementById('subtotal').textContent = '0 ريال';
        document.getElementById('totalPrice').textContent = '0 ريال';
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
                    <div class="cart-item-name">${item.name}</

/* ========================================
   متجرك - الجافاسكريبت الكامل (الجزء الثاني)
   SQLite Database + EmailJS + Google Sheets
   ======================================== */

                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${parseFloat(item.price).toFixed(2)} ريال</div>
                    <div class="cart-item-qty">الكمية: ${item.quantity}</div>
                </div>
                <button class="btn btn-danger" onclick="removeFromCart(${item.id})" style="padding:6px 12px;font-size:0.8rem;">حذف</button>
            </div>
        `;
    }).join('');
    
    document.getElementById('subtotal').textContent = total.toFixed(2) + ' ريال';
    document.getElementById('totalPrice').textContent = total.toFixed(2) + ' ريال';
}

function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id != productId);
    saveCart(cart);
    displayCart();
    updateCartCount();
    showToast('تم الحذف من السلة', 'success');
}

// ==================== إتمام الطلب ====================
function handleCheckout(e) {
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
        date: new Date().toLocaleString('ar-SA')
    };
    
    // حفظ في SQLite
    addOrder(orderData);
    
    // إرسال بريد
    sendEmail(orderData);
    
    // إرسال لـ Google Sheets
    sendToGoogleSheets(orderData);
    
    // تفريغ السلة
    saveCart([]);
    updateCartCount();
    
    showToast('تم إرسال طلبك بنجاح! سنتواصل معك قريباً', 'success');
    
    btn.disabled = false;
    btn.textContent = 'تأكيد الطلب';
    document.getElementById('checkoutForm').reset();
    displayCart();
}

function sendEmail(orderData) {
    const publicKey = getSetting('emailjs_key');
    const serviceId = getSetting('emailjs_service');
    const templateId = getSetting('emailjs_template');
    
    if (!publicKey || !serviceId || !templateId) {
        console.log('⚠️ EmailJS غير مُهيأ');
        return;
    }
    
    try {
        emailjs.init(publicKey);
        
        const templateParams = {
            to_email: orderData.customerEmail,
            to_name: orderData.customerName,
            order_id: orderData.orderId,
            order_details: orderData.items.map(i => `${i.name} x${i.quantity} - ${(i.price*i.quantity).toFixed(2)} ريال`).join('\n'),
            order_total: orderData.total.toFixed(2) + ' ريال',
            customer_phone: orderData.customerPhone,
            customer_address: `${orderData.customerCity} - ${orderData.customerAddress}`
        };
        
        emailjs.send(serviceId, templateId, templateParams)
            .then(() => console.log('📧 Email sent successfully'))
            .catch(err => console.error('Email error:', err));
    } catch (e) {
        console.error('EmailJS error:', e);
    }
}

function sendToGoogleSheets(orderData) {
    const scriptUrl = getSetting('sheets_url');
    if (!scriptUrl) {
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
        date: orderData.date,
        notes: orderData.orderNotes
    };
    
    fetch(scriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors'
    })
    .then(() => console.log('📊 Sent to Google Sheets'))
    .catch(err => console.error('Sheets error:', err));
}

// ==================== لوحة التحكم - Dashboard ====================
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

function loadDashboard() {
    const products = getProducts();
    const orders = getOrders('all');
    const pending = getOrders('pending');
    
    // إجمالي الأرباح (الطلبات المكتملة فقط)
    const completed = getOrders('completed');
    const totalEarnings = completed.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    
    document.getElementById('statProducts').textContent = products.length;
    document.getElementById('statOrders').textContent = orders.length;
    document.getElementById('statPending').textContent = pending.length;
    document.getElementById('statEarnings').textContent = totalEarnings.toFixed(2) + ' ريال';
    
    // آخر 5 طلبات
    const recent = orders.slice(0, 5);
    const tbody = document.getElementById('recentOrdersTable');
    if (!tbody) return;
    
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
        
        return `
            <tr>
                <td>${o.order_id}</td>
                <td>${o.customer_name}</td>
                <td>${parseFloat(o.total).toFixed(2)} ريال</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${new Date(o.created_at).toLocaleDateString('ar-SA')}</td>
            </tr>
        `;
    }).join('');
}

// ==================== المنتجات في الأدمن ====================
function loadAdminProducts() {
    const tbody = document.getElementById('productsTable');
    const badge = document.getElementById('totalProductsBadge');
    if (!tbody) return;
    
    const products = getProducts();
    if (badge) badge.textContent = products.length + ' منتج';
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">لا توجد منتجات بعد</td></tr>';
        return;
    }
    
    tbody.innerHTML = products.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><img src="${p.image || 'https://via.placeholder.com/50x50/1a1a1a/666?text=No+Image'}" alt="" onerror="this.src='https://via.placeholder.com/50x50/1a1a1a/666?text=No+Image'"></td>
            <td>${p.name}</td>
            <td>${parseFloat(p.price).toFixed(2)} ريال</td>
            <td>${p.stock || 0}</td>
            <td>
                <button class="btn btn-edit" onclick="editProduct(${p.id})">تعديل</button>
                <button class="btn btn-danger" onclick="deleteProductAdmin(${p.id})">حذف</button>
            </td>
        </tr>
    `).join('');
}

function handleProductSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const category = document.getElementById('productCategory').value.trim();
    const stock = parseInt(document.getElementById('productStock').value) || 0;
    const image = document.getElementById('productImage').value.trim();
    const description = document.getElementById('productDesc').value.trim();
    
    if (!name || isNaN(price)) {
        showToast('يرجى ملء الحقول المطلوبة', 'error');
        return;
    }
    
    if (id) {
        updateProduct(id, name, price, category, stock, image, description);
        showToast('تم تعديل المنتج بنجاح', 'success');
    } else {
        addProduct(name, price, category, stock, image, description);
        showToast('تمت إضافة المنتج بنجاح', 'success');
    }
    
    loadAdminProducts();
    resetProductForm();
}

function editProduct(productId) {
    const p = getProductById(productId);
    if (!p) return;
    
    document.getElementById('productId').value = p.id;
    document.getElementById('productName').value = p.name;
    document.getElementById('productPrice').value = p.price;
    document.getElementById('productCategory').value = p.category || '';
    document.getElementById('productStock').value = p.stock || 0;
    document.getElementById('productImage').value = p.image || '';
    document.getElementById('productDesc').value = p.description || '';
    
    document.getElementById('submitBtn').textContent = 'حفظ التعديلات';
    document.getElementById('cancelBtn').style.display = 'inline-flex';
    
    document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
}

function deleteProductAdmin(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    deleteProduct(productId);
    loadAdminProducts();
    showToast('تم حذف المنتج', 'success');
}

function resetProductForm() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('submitBtn').textContent = 'إضافة المنتج';
    document.getElementById('cancelBtn').style.display = 'none';
}

// ==================== الطلبات ====================
let currentOrderFilter = 'all';

function loadOrders(status) {
    currentOrderFilter = status;
    const tbody = document.getElementById('ordersTable');
    if (!tbody) return;
    
    const orders = getOrders(status);
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px;">لا توجد طلبات</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.map(o => {
        const items = JSON.parse(o.items || '[]');
        const itemsText = items.map(i => `${i.name} (x${i.quantity})`).join(', ');
        
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
        
        return `
            <tr>
                <td>${o.order_id}</td>
                <td>${o.customer_name}</td>
                <td>${o.customer_phone}</td>
                <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${itemsText}</td>
                <td>${parseFloat(o.total).toFixed(2)} ريال</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${new Date(o.created_at).toLocaleDateString('ar-SA')}</td>
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

function changeOrderStatus(orderId, status) {
    updateOrderStatus(orderId, status);
    const statusNames = {
        pending: 'معلق',
        completed: 'تم',
        cancelled: 'ملغي',
        returned: 'مرتجع'
    };
    showToast(`تم تغيير حالة الطلب إلى: ${statusNames[status]}`, 'success');
    loadOrders(currentOrderFilter);
    loadDashboard();
    loadEarnings();
}

// ==================== الأرباح ====================
function loadEarnings() {
    const totalEl = document.getElementById('totalEarnings');
    const monthEl = document.getElementById('monthEarnings');
    const completedEl = document.getElementById('completedOrders');
    const tbody = document.getElementById('monthlyEarningsTable');
    
    const completed = getOrders('completed');
    const totalEarnings = completed.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    
    // أرباح هذا الشهر
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthOrders = completed.filter(o => {
        const d = new Date(o.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthEarnings = monthOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    
    if (totalEl) totalEl.textContent = totalEarnings.toFixed(2) + ' ريال';
    if (monthEl) monthEl.textContent = monthEarnings.toFixed(2) + ' ريال';
    if (completedEl) completedEl.textContent = completed.length;
    
    // جدول الأرباح الشهرية
    if (!tbody) return;
    
    const monthly = getMonthlyEarnings();
    if (monthly.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:32px;">لا توجد أرباح بعد</td></tr>';
        return;
    }
    
    tbody.innerHTML = monthly.map(m => `
        <tr>
            <td>${m.month}</td>
            <td>${m.orders}</td>
            <td>${m.total.toFixed(2)} ريال</td>
            <td style="color:var(--success);font-weight:700;">${m.total.toFixed(2)} ريال</td>
        </tr>
    `).join('');
}

function getMonthlyEarnings() {
    const completed = getOrders('completed');
    const months = {};
    
    completed.forEach(o => {
        const d = new Date(o.created_at);
        const key = d.toLocaleString('ar-SA', { year: 'numeric', month: 'long' });
        if (!months[key]) months[key] = { month: key, orders: 0, total: 0 };
        months[key].orders++;
        months[key].total += parseFloat(o.total || 0);
    });
    
    return Object.values(months).sort((a, b) => {
        // ترتيب تنازلي حسب التاريخ (بشكل تقريبي)
        return b.total - a.total;
    });
}

// ==================== السلايدر ====================
function renderSlider() {
    const container = document.getElementById('sliderContainer');
    const dotsContainer = document.getElementById('sliderDots');
    if (!container) return;
    
    const slides = getSliderImages();
    
    if (slides.length === 0) {
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
        const slides = getSliderImages();
        if (slides.length === 0) return;
        currentSlide = (currentSlide + 1) % slides.length;
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
    if (container) {
        container.style.transform = `translateX(${currentSlide * 100}%)`;
    }
    document.querySelectorAll('.slider-dot').forEach((d, i) => {
        d.classList.toggle('active', i === currentSlide);
    });
}

function loadSliderAdmin() {
    const grid = document.getElementById('sliderPreviewGrid');
    if (!grid) return;
    
    const slides = getSliderImages();
    if (slides.length === 0) {
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

function handleSliderSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('slideId').value;
    const title = document.getElementById('slideTitle').value.trim();
    const imageUrl = document.getElementById('slideImage').value.trim();
    const linkUrl = document.getElementById('slideLink').value.trim();
    const order = parseInt(document.getElementById('slideOrder').value) || 1;
    
    if (!title || !imageUrl) {
        showToast('يرجى ملء الحقول المطلوبة', 'error');
        return;
    }
    
    if (id) {
        updateSliderImage(id, title, imageUrl, linkUrl, order);
        showToast('تم تعديل السلايد بنجاح', 'success');
    } else {
        addSliderImage(title, imageUrl, linkUrl, order);
        showToast('تمت إضافة السلايد بنجاح', 'success');
    }
    
    loadSliderAdmin();
    resetSliderForm();
}

function editSlider(id) {
    const stmt = db.prepare("SELECT * FROM slider_images WHERE id = ?");
    stmt.bind([id]);
    const s = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    if (!s) return;
    
    document.getElementById('slideId').value = s.id;
    document.getElementById('slideTitle').value = s.title;
    document.getElementById('slideImage').value = s.image_url;
    document.getElementById('slideLink').value = s.link_url || '';
    document.getElementById('slideOrder').value = s.sort_order;
    
    document.getElementById('slideSubmitBtn').textContent = 'حفظ التعديلات';
    document.getElementById('slideCancelBtn').style.display = 'inline-flex';
}

function deleteSlider(id) {
    if (!confirm('هل أنت متأكد من حذف هذا السلايد؟')) return;
    deleteSliderImage(id);
    loadSliderAdmin();
    showToast('تم حذف السلايد', 'success');
}

function resetSliderForm() {
    document.getElementById('sliderForm').reset();
    document.getElementById('slideId').value = '';
    document.getElementById('slideSubmitBtn').textContent = 'إضافة سلايد';
    document.getElementById('slideCancelBtn').style.display = 'none';
}

// ==================== الإعدادات والألوان ====================
function loadSettings() {
    document.getElementById('emailjsKey').value = getSetting('emailjs_key') || '';
    document.getElementById('emailjsService').value = getSetting('emailjs_service') || '';
    document.getElementById('emailjsTemplate').value = getSetting('emailjs_template') || '';
    document.getElementById('sheetsUrl').value = getSetting('sheets_url') || '';
    
    const theme = getSetting('theme');
    if (theme) {
        const t = JSON.parse(theme);
        document.getElementById('bgColor').value = t.bg || '#0a0a0a';
        document.getElementById('textColor').value = t.text || '#ffffff';
        document.getElementById('btnColor').value = t.btn || '#ffffff';
        document.getElementById('bgSecondary').value = t.bgSecondary || '#111111';
    }
}

function saveSettings() {
    setSetting('emailjs_key', document.getElementById('emailjsKey').value.trim());
    setSetting('emailjs_service', document.getElementById('emailjsService').value.trim());
    setSetting('emailjs_template', document.getElementById('emailjsTemplate').value.trim());
    setSetting('sheets_url', document.getElementById('sheetsUrl').value.trim());
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
        bg: document.getElementById('bgColor').value,
        text: document.getElementById('textColor').value,
        btn: document.getElementById('btnColor').value,
        bgSecondary: document.getElementById('bgSecondary').value
    };
    setSetting('theme', JSON.stringify(theme));
    showToast('تم حفظ الألوان', 'success');
}

function resetTheme() {
    const defaults = { bg: '#0a0a0a', text: '#ffffff', btn: '#ffffff', bgSecondary: '#111111' };
    document.getElementById('bgColor').value = defaults.bg;
    document.getElementById('textColor').value = defaults.text;
    document.getElementById('btnColor').value = defaults.btn;
    document.getElementById('bgSecondary').value = defaults.bgSecondary;
    updateTheme();
    setSetting('theme', JSON.stringify(defaults));
    showToast('تمت إعادة الألوان الافتراضية', 'success');
}

function loadTheme() {
    const theme = getSetting('theme');
    if (theme) {
        const t = JSON.parse(theme);
        document.documentElement.style.setProperty('--bg-primary', t.bg || '#0a0a0a');
        document.documentElement.style.setProperty('--bg-secondary', t.bgSecondary || '#111111');
        document.documentElement.style.setProperty('--text-primary', t.text || '#ffffff');
        document.documentElement.style.setProperty('--accent', t.btn || '#ffffff');
    }
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

// ==================== إعادة تعيين قاعدة البيانات (للتطوير) ====================
function resetDatabase() {
    if (!confirm('هل أنت متأكد من حذف جميع البيانات؟')) return;
    localStorage.removeItem('store_db');
    localStorage.removeItem('store_cart');
    location.reload();
}
