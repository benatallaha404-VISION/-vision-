/* ========================================
   متجرك - الجافاسكريبت الكامل
   LocalStorage + EmailJS + Google Sheets
   ======================================== */

// ==================== LocalStorage ====================
const STORAGE_KEYS = {
    PRODUCTS: 'store_products',
    CART: 'store_cart',
    ORDERS: 'store_orders',
    THEME: 'store_theme'
};

// الحصول على المنتجات
function getProducts() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS)) || [];
}

// حفظ المنتجات
function saveProducts(products) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
}

// الحصول على السلة
function getCart() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CART)) || [];
}

// حفظ السلة
function saveCart(cart) {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
}

// ==================== عرض المنتجات (الرئيسية) ====================
function displayProducts(productsToShow = null) {
    const grid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    const countEl = document.getElementById('productsCount');
    
    if (!grid) return;
    
    const products = productsToShow || getProducts();
    
    if (products.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        if (countEl) countEl.textContent = 'لا توجد منتجات';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    if (countEl) countEl.textContent = `${products.length} منتج`;
    
    grid.innerHTML = products.map(product => `
        <div class="product-card" onclick="goToProduct('${product.id}')">
            <img src="${product.image || 'https://via.placeholder.com/400x400/1a1a1a/666?text=No+Image'}" 
                 alt="${product.name}" class="product-image">
            <div class="product-info">
                <div class="product-category">${product.category || 'عام'}</div>
                <h3 class="product-name">${product.name}</h3>
                <div class="product-price">${parseFloat(product.price).toFixed(2)} ريال</div>
                <div class="product-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-primary" onclick="addToCart('${product.id}')">
                        أضف للسلة
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// البحث
function searchProducts() {
    const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const products = getProducts();
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(query) || 
        (p.category && p.category.toLowerCase().includes(query))
    );
    displayProducts(filtered);
}

// الانتقال لصفحة المنتج
function goToProduct(productId) {
    window.location.href = `product.html?id=${productId}`;
}

// ==================== صفحة المنتج التفصيلية ====================
function displayProductDetail() {
    const container = document.getElementById('productDetail');
    if (!container) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    const products = getProducts();
    const product = products.find(p => p.id === productId);
    
    if (!product) {
        container.innerHTML = `
            <div class="empty-state">
                <p>المنتج غير موجود</p>
                <a href="index.html" class="btn btn-primary">العودة للرئيسية</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <img src="${product.image || 'https://via.placeholder.com/600x600/1a1a1a/666?text=No+Image'}" 
             alt="${product.name}" class="product-detail-image">
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
            <button class="btn btn-primary btn-block" onclick="addToCart('${product.id}', getQty())" style="width:auto;">
                أضف للسلة - <span id="btnTotal">${parseFloat(product.price).toFixed(2)}</span> ريال
            </button>
        </div>
    `;
    
    window.currentProductPrice = parseFloat(product.price);
}

let currentQty = 1;
function changeQty(delta) {
    currentQty = Math.max(1, currentQty + delta);
    const qtyEl = document.getElementById('qtyValue');
    const btnTotal = document.getElementById('btnTotal');
    if (qtyEl) qtyEl.textContent = currentQty;
    if (btnTotal && window.currentProductPrice) {
        btnTotal.textContent = (currentQty * window.currentProductPrice).toFixed(2);
    }
}

function getQty() {
    return currentQty;
}

// ==================== السلة ====================
function addToCart(productId, quantity = 1) {
    const products = getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    let cart = getCart();
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
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
                <img src="${item.image || 'https://via.placeholder.com/80x80/1a1a1a/666?text=No+Image'}" alt="${item.name}">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${parseFloat(item.price).toFixed(2)} ريال</div>
                    <div class="cart-item-qty">الكمية: ${item.quantity}</div>
                </div>
                <button class="btn btn-danger" onclick="removeFromCart('${item.id}')" style="padding:6px 12px;font-size:0.8rem;">حذف</button>
            </div>
        `;
    }).join('');
    
    document.getElementById('subtotal').textContent = total.toFixed(2) + ' ريال';
    document.getElementById('totalPrice').textContent = total.toFixed(2) + ' ريال';
}

function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    displayCart();
    updateCartCount();
    showToast('تم الحذف من السلة', 'success');
}

// ==================== لوحة التحكم ====================
function loadAdminProducts() {
    const tbody = document.getElementById('productsTable');
    const emptyState = document.getElementById('adminEmptyState');
    const badge = document.getElementById('totalProducts');
    
    if (!tbody) return;
    
    const products = getProducts();
    
    if (badge) badge.textContent = `${products.length} منتج`;
    
    if (products.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    tbody.innerHTML = products.map((product, index) => `
        <tr>
            <td>${index + 1}</td>
            <td><img src="${product.image || 'https://via.placeholder.com/50x50/1a1a1a/666?text=No+Image'}" alt=""></td>
            <td>${product.name}</td>
            <td>${parseFloat(product.price).toFixed(2)} ريال</td>
            <td>${product.stock || 0}</td>
            <td>
                <button class="btn btn-edit" onclick="editProduct('${product.id}')">تعديل</button>
                <button class="btn btn-danger" onclick="deleteProduct('${product.id}')">حذف</button>
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
    
    let products = getProducts();
    
    if (id) {
        // تعديل
        const index = products.findIndex(p => p.id === id);
        if (index !== -1) {
            products[index] = { ...products[index], name, price, category, stock, image, description };
            showToast('تم تعديل المنتج بنجاح', 'success');
        }
    } else {
        // إضافة جديدة
        const newProduct = {
            id: Date.now().toString(),
            name,
            price,
            category,
            stock,
            image,
            description,
            createdAt: new Date().toISOString()
        };
        products.push(newProduct);
        showToast('تمت إضافة المنتج بنجاح', 'success');
    }
    
    saveProducts(products);
    loadAdminProducts();
    resetForm();
}

function editProduct(productId) {
    const products = getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productCategory').value = product.category || '';
    document.getElementById('productStock').value = product.stock || 0;
    document.getElementById('productImage').value = product.image || '';
    document.getElementById('productDesc').value = product.description || '';
    
    document.getElementById('submitBtn').textContent = 'حفظ التعديلات';
    document.getElementById('cancelBtn').style.display = 'inline-flex';
    
    document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
}

function deleteProduct(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    
    let products = getProducts();
    products = products.filter(p => p.id !== productId);
    saveProducts(products);
    loadAdminProducts();
    showToast('تم حذف المنتج', 'success');
}

function resetForm() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('submitBtn').textContent = 'إضافة المنتج';
    document.getElementById('cancelBtn').style.display = 'none';
}

// ==================== تخصيص الألوان ====================
function updateTheme() {
    const bg = document.getElementById('bgColor')?.value || '#0a0a0a';
    const text = document.getElementById('textColor')?.value || '#ffffff';
    const btn = document.getElementById('btnColor')?.value || '#ffffff';
    
    document.documentElement.style.setProperty('--bg-primary', bg);
    document.documentElement.style.setProperty('--text-primary', text);
    document.documentElement.style.setProperty('--accent', btn);
    
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify({ bg, text, btn }));
}

function loadThemeSettings() {
    const theme = JSON.parse(localStorage.getItem(STORAGE_KEYS.THEME));
    if (!theme) return;
    
    if (document.getElementById('bgColor')) document.getElementById('bgColor').value = theme.bg;
    if (document.getElementById('textColor')) document.getElementById('textColor').value = theme.text;
    if (document.getElementById('btnColor')) document.getElementById('btnColor').value = theme.btn;
    
    document.documentElement.style.setProperty('--bg-primary', theme.bg);
    document.documentElement.style.setProperty('--text-primary', theme.text);
    document.documentElement.style.setProperty('--accent', theme.btn);
}

function resetTheme() {
    const defaults = { bg: '#0a0a0a', text: '#ffffff', btn: '#ffffff' };
    if (document.getElementById('bgColor')) document.getElementById('bgColor').value = defaults.bg;
    if (document.getElementById('textColor')) document.getElementById('textColor').value = defaults.text;
    if (document.getElementById('btnColor')) document.getElementById('btnColor').value = defaults.btn;
    updateTheme();
    localStorage.removeItem(STORAGE_KEYS.THEME);
}

// ==================== إتمام الطلب + EmailJS + Google Sheets ====================
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
        customerName: document.getElementById('customerName').value,
        customerPhone: document.getElementById('customerPhone').value,
        customerEmail: document.getElementById('customerEmail').value,
        customerCity: document.getElementById('customerCity').value,
        customerAddress: document.getElementById('customerAddress').value,
        orderNotes: document.getElementById('orderNotes').value,
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        date: new Date().toLocaleString('ar-SA')
    };
    
    // 1️⃣ حفظ الطلب محلياً
    let orders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS)) || [];
    orders.push(orderData);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    
    // 2️⃣ إرسال بريد عبر EmailJS
    sendEmail(orderData);
    
    // 3️⃣ إرسال لـ Google Sheets
    sendToGoogleSheets(orderData);
    
    // 4️⃣ تفريغ السلة
    saveCart([]);
    updateCartCount();
    
    setTimeout(() => {
        showToast('تم إرسال طلبك بنجاح! ✅', 'success');
        btn.disabled = false;
        btn.textContent = 'تأكيد الطلب';
        document.getElementById('checkoutForm').reset();
        displayCart();
    }, 1500);
}

// EmailJS - أرسل إيميل للعميل والمشرف
function sendEmail(orderData) {
    // ⚠️ استبدل هذه القيم بقيمك من EmailJS
    const SERVICE_ID = 'YOUR_SERVICE_ID';
    const TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
    
    const templateParams = {
        to_email: orderData.customerEmail,
        to_name: orderData.customerName,
        order_id: orderData.orderId,
        order_details: orderData.items.map(i => `${i.name} x${i.quantity} - ${(i.price*i.quantity).toFixed(2)} ريال`).join('\n'),
        order_total: orderData.total.toFixed(2) + ' ريال',
        customer_phone: orderData.customerPhone,
        customer_address: `${orderData.customerCity} - ${orderData.customerAddress}`
    };
    
    // إلغاء التعليق بعد إعداد EmailJS
    /*
    emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams)
        .then(() => console.log('Email sent!'))
        .catch(err => console.error('Email error:', err));
    */
    
    console.log('📧 بيانات الإيميل:', templateParams);
}

// Google Sheets - إرسال البيانات
function sendToGoogleSheets(orderData) {
    // ⚠️ استبدل هذا الرابط برابط Google Apps Script الخاص بك
    const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_SCRIPT_URL';
    
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
    
    // إلغاء التعليق بعد إعداد Google Sheets
    /*
    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
    })
    .then(res => res.text())
    .then(text => console.log('Sheets response:', text))
    .catch(err => console.error('Sheets error:', err));
    */
    
    console.log('📊 بيانات Google Sheets:', payload);
}

// ==================== Toast Notification ====================
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

// ==================== تهيئة أولية ====================
document.addEventListener('DOMContentLoaded', () => {
    // إضافة منتجات تجريبية إذا كانت فارغة (للاختبار فقط)
    const products = getProducts();
    if (products.length === 0) {
        const demoProducts = [
            {
                id: '1',
                name: 'سماعات لاسلكية فاخرة',
                price: 349.00,
                category: 'إلكترونيات',
                stock: 15,
                image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
                description: 'سماعات بلوتوث عالية الجودة مع إلغاء الضوضاء النشط وعمر بطارية يصل إلى 30 ساعة.'
            },
            {
                id: '2',
                name: 'ساعة يد ذكية',
                price: 599.00,
                category: 'إلكترونيات',
                stock: 8,
                image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
                description: 'تتبع اللياقة البدنية، قياس نبضات القلب، مقاومة للماء حتى 50 متر.'
            },
            {
                id: '3',
                name: 'حقيبة جلد طبيعي',
                price: 899.00,
                category: 'أزياء',
                stock: 5,
                image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop',
                description: 'حقيبة يد مصنوعة يدوياً من الجلد الطبيعي الإيطالي الفاخر.'
            },
            {
                id: '4',
                name: 'نظارة شمسية كلاسيكية',
                price: 450.00,
                category: 'أزياء',
                stock: 12,
                image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop',
                description: 'عدسات UV400 مع إطار معدني خفيف الوزن بتصميم كلاسيكي أنيق.'
            }
        ];
        saveProducts(demoProducts);
    }
});
