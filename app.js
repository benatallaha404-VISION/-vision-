// =====================================
// APP.JS - Home page logic
// =====================================

console.log("✅ App.js loaded");

if (typeof firebase !== "undefined" && firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
let allProducts = [];
let currentSlideIndex = 0;
let sliderTimer = null;

// ============================================
// APPLY STORE SETTINGS
// ============================================
function applyStoreSettings() {
  const settings = loadStoreSettings();
  
  document.documentElement.style.setProperty("--primary-color", settings.primaryColor);
  document.documentElement.style.setProperty("--secondary-color", settings.secondaryColor);
  document.documentElement.style.setProperty("--accent-color", settings.accentColor);
  document.documentElement.style.setProperty("--text-color", settings.textColor);

  const brandLogo = document.getElementById("brandLogo");
  const brandName = document.getElementById("brandName");
  const brandNick = document.getElementById("brandNick");
  const footerStoreName = document.getElementById("footerStoreName");
  const footerText = document.getElementById("footerText");
  const siteTitle = document.getElementById("siteTitle");

  if (brandLogo && settings.logoUrl) brandLogo.src = settings.logoUrl;
  if (brandName) brandName.textContent = settings.storeName || "My Store";
  if (brandNick) brandNick.textContent = settings.nickname || "best shop online";
  if (footerStoreName) footerStoreName.textContent = settings.storeName || "My Store";
  if (footerText) footerText.textContent = settings.footerText || "© 2025 My Store - All rights reserved";
  if (siteTitle) siteTitle.textContent = settings.storeName || "My Store";

  // Apply card style
  document.body.className = settings.cardStyle || 'classic';
}

// ============================================
// SLIDER FUNCTIONS
// ============================================
function renderSlider(slides) {
  const track = document.getElementById("sliderTrack");
  const dots = document.getElementById("sliderDots");
  if (!track) return;

  if (!slides || !slides.length) {
    slides = [
      { title: "Welcome to Our Store", text: "Discover amazing products at great prices.", image: "assets/images/slide1.jpg" },
      { title: "Special Offers", text: "Check out our latest deals and discounts.", image: "assets/images/slide2.jpg" }
    ];
  }

  track.innerHTML = slides.map((slide, index) => `
    <div class="slide" style="background-image:url('${slide.image || 'assets/images/placeholder.jpg'}')">
      <div class="slide-overlay">
        <div class="slide-content">
          <h2>${slide.title || ''}</h2>
          <p>${slide.text || ''}</p>
        </div>
      </div>
    </div>
  `).join("");

  // Dots
  if (dots) {
    dots.innerHTML = slides.map((_, index) => `
      <span class="dot ${index === 0 ? 'active' : ''}" onclick="goToSlide(${index})"></span>
    `).join("");
  }

  currentSlideIndex = 0;
  updateSliderPosition();
  startAutoSlide();
}

function updateSliderPosition() {
  const track = document.getElementById("sliderTrack");
  const dots = document.querySelectorAll(".dot");
  if (!track) return;
  
  track.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
  
  dots.forEach((dot, index) => {
    dot.classList.toggle('active', index === currentSlideIndex);
  });
}

function goToSlide(index) {
  const track = document.getElementById("sliderTrack");
  if (!track || !track.children.length) return;
  currentSlideIndex = (index + track.children.length) % track.children.length;
  updateSliderPosition();
  resetAutoSlide();
}

function nextSlide() {
  const track = document.getElementById("sliderTrack");
  if (!track || !track.children.length) return;
  currentSlideIndex = (currentSlideIndex + 1) % track.children.length;
  updateSliderPosition();
}

function prevSlide() {
  const track = document.getElementById("sliderTrack");
  if (!track || !track.children.length) return;
  currentSlideIndex = (currentSlideIndex - 1 + track.children.length) % track.children.length;
  updateSliderPosition();
}

function startAutoSlide() {
  if (sliderTimer) clearInterval(sliderTimer);
  sliderTimer = setInterval(nextSlide, 5000);
}

function resetAutoSlide() {
  if (sliderTimer) {
    clearInterval(sliderTimer);
    sliderTimer = setInterval(nextSlide, 5000);
  }
}

// ============================================
// CATEGORY FUNCTIONS
// ============================================
function renderCategories(categories) {
  const grid = document.getElementById("categoriesGrid");
  const filterSelect = document.getElementById("filterCategory");
  if (!grid) return;

  if (!categories || !categories.length) {
    categories = [{ name: "All" }, { name: "Clothes" }, { name: "Shoes" }, { name: "Accessories" }];
  }

  grid.innerHTML = categories.map(cat => `
    <div class="card category-card" onclick="filterByCategory('${cat.name}')">
      <span class="icon">📁</span>
      <h3>${cat.name}</h3>
    </div>
  `).join("");

  // Update filter dropdown
  if (filterSelect) {
    const currentValue = filterSelect.value;
    filterSelect.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.name;
      option.textContent = cat.name;
      filterSelect.appendChild(option);
    });
    if (currentValue) filterSelect.value = currentValue;
  }
}

// ============================================
// PRODUCT FUNCTIONS
// ============================================
function renderProducts(products, containerId = "productsGrid") {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!products || !products.length) {
    container.innerHTML = "<p class='small-note'>No products available</p>";
    return;
  }

  const settings = loadStoreSettings();
  const cardClass = settings.cardStyle || 'classic';

  container.innerHTML = products.map(product => `
    <div class="card product-card ${cardClass}">
      <div class="product-image-wrap">
        <img src="${product.images && product.images.length > 0 ? product.images[0] : 'assets/images/placeholder.jpg'}" alt="${product.name}" loading="lazy" />
        ${product.isSpecialOffer ? `<span class="badge sale">Special Offer</span>` : ""}
        ${product.isBestSeller ? `<span class="badge best">Best Seller</span>` : ""}
      </div>
      <div class="card-body">
        <h3>${product.name || ''}</h3>
        <p class="category-tag">${product.category || ''}</p>
        <div class="price-row">
          ${product.beforeDiscount ? `<span class="old-price">${product.beforeDiscount} DZD</span>` : ""}
          <strong class="current-price">${product.afterDiscount || product.price || 0} DZD</strong>
        </div>
        <div class="product-rating">
          <span class="stars">${getStarRatingHTML(product.averageRating || 0)}</span>
          <span class="count">(${product.reviewCount || 0})</span>
        </div>
        <div class="card-actions">
          <button class="add-cart-btn" onclick="addToCart('${product.id}')"><i class="fas fa-cart-plus"></i> Add to Cart</button>
          <a href="product.html?id=${product.id}">
            <button class="view-btn">View Product</button>
          </a>
        </div>
      </div>
    </div>
  `).join("");
}

function getStarRatingHTML(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  let html = '';
  for (let i = 0; i < full; i++) html += '★';
  if (half) html += '☆';
  for (let i = 0; i < empty; i++) html += '☆';
  return html || '☆☆☆☆☆';
}

// ============================================
// FILTER AND SORT FUNCTIONS
// ============================================
function filterByCategory(category) {
  if (category === 'all') {
    applyFiltersAndSort(allProducts);
  } else {
    const filtered = allProducts.filter(p => p.category === category);
    applyFiltersAndSort(filtered);
  }
}

function applyFiltersAndSort(products) {
  const categoryFilter = document.getElementById('filterCategory');
  const sortSelect = document.getElementById('sortProducts');
  
  let filtered = [...products];
  
  // Filter by category
  if (categoryFilter && categoryFilter.value !== 'all') {
    filtered = filtered.filter(p => p.category === categoryFilter.value);
  }
  
  // Sort
  if (sortSelect) {
    const sortBy = sortSelect.value;
    switch(sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => (a.afterDiscount || a.price || 0) - (b.afterDiscount || b.price || 0));
        break;
      case 'price-desc':
        filtered.sort((a, b) => (b.afterDiscount || b.price || 0) - (a.afterDiscount || a.price || 0));
        break;
      case 'best-seller':
        filtered = filtered.filter(p => p.isBestSeller);
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        break;
    }
  }
  
  renderProducts(filtered);
}

// ============================================
// SEARCH FUNCTION
// ============================================
function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  searchInput.addEventListener("input", function() {
    const term = this.value.trim().toLowerCase();
    if (!term) {
      applyFiltersAndSort(allProducts);
      return;
    }
    const filtered = allProducts.filter(p =>
      (p.name || "").toLowerCase().includes(term) ||
      (p.category || "").toLowerCase().includes(term) ||
      (p.description || "").toLowerCase().includes(term)
    );
    renderProducts(filtered);
  });
}

// ============================================
// CART FUNCTIONS
// ============================================
let cart = JSON.parse(localStorage.getItem('cart')) || [];

function toggleCart() {
  document.getElementById('cartSidebar').classList.toggle('open');
  document.querySelector('.cart-overlay').classList.toggle('open');
}

function openCart() {
  document.getElementById('cartSidebar').classList.add('open');
  document.querySelector('.cart-overlay').classList.add('open');
}

function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.afterDiscount || product.price || 0,
      image: product.images && product.images.length > 0 ? product.images[0] : 'assets/images/placeholder.jpg',
      quantity: 1
    });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartUI();
  showNotification(`${product.name} added to cart!`, 'success');
  openCart();
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartUI();
  showNotification('Item removed from cart', 'info');
}

function updateCartUI() {
  const count = document.getElementById('cartCount');
  const items = document.getElementById('cartItems');
  const total = document.getElementById('cartTotal');

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (count) count.textContent = totalItems;

  if (items) {
    if (cart.length === 0) {
      items.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
    } else {
      items.innerHTML = cart.map(item => `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.name}" />
          <div class="item-info">
            <h4>${item.name}</h4>
            <div class="item-price">${item.price} DZD x ${item.quantity}</div>
            <span class="remove-item" onclick="removeFromCart('${item.id}')">Remove</span>
          </div>
        </div>
      `).join('');
    }
  }

  if (total) {
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    total.textContent = `${totalPrice} DZD`;
  }
}

function proceedToCheckout() {
  if (cart.length === 0) {
    showNotification('Your cart is empty!', 'error');
    return;
  }
  window.location.href = 'checkout.html';
}

// ============================================
// NOTIFICATION
// ============================================
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.classList.add('show'), 100);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 400);
  }, 3000);
}

// ============================================
// LOAD HOME PAGE
// ============================================
async function loadHomePage() {
  applyStoreSettings();

  try {
    const productsSnap = await db.collection("products").get();
    const categoriesSnap = await db.collection("categories").get();
    const slidesSnap = await db.collection("slides").get();

    const products = [];
    productsSnap.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
    allProducts = products;

    const categories = [];
    categoriesSnap.forEach(doc => categories.push({ id: doc.id, ...doc.data() }));

    const slides = [];
    slidesSnap.forEach(doc => slides.push({ id: doc.id, ...doc.data() }));

    renderSlider(slides);
    renderCategories(categories);
    applyFiltersAndSort(products);

    // Setup event listeners
    document.getElementById('filterCategory')?.addEventListener('change', () => applyFiltersAndSort(allProducts));
    document.getElementById('sortProducts')?.addEventListener('change', () => applyFiltersAndSort(allProducts));
    document.getElementById('prevSlide')?.addEventListener('click', prevSlide);
    document.getElementById('nextSlide')?.addEventListener('click', nextSlide);

    updateCartUI();
    setupSearch();

  } catch (error) {
    console.error("Error loading home page:", error);
    renderSlider([]);
    renderCategories([]);
    renderProducts([]);
  }
}

document.addEventListener("DOMContentLoaded", loadHomePage);

// Expose functions
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.openCart = openCart;
window.proceedToCheckout = proceedToCheckout;
window.filterByCategory = filterByCategory;
window.goToSlide = goToSlide;