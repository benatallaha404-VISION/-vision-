// =====================================
// APP.JS
// Home page logic
// =====================================

if (typeof firebase !== "undefined" && firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
let currentSlideIndex = 0;
let sliderTimer = null;

function applyStoreSettings() {
  const settings = loadStoreSettings();
  
  document.documentElement.style.setProperty("--primary-color", settings.primaryColor);
  document.documentElement.style.setProperty("--secondary-color", settings.secondaryColor);
  document.documentElement.style.setProperty("--accent-color", settings.accentColor);

  const brandLogo = document.getElementById("brandLogo");
  const brandName = document.getElementById("brandName");
  const brandNick = document.getElementById("brandNick");
  const footerStoreName = document.getElementById("footerStoreName");
  const footerText = document.getElementById("footerText");

  if (brandLogo && settings.logoUrl) brandLogo.src = settings.logoUrl;
  if (brandName) brandName.textContent = settings.storeName || "My Store";
  if (brandNick) brandNick.textContent = settings.nickname || "best shop online";
  if (footerStoreName) footerStoreName.textContent = settings.storeName || "My Store";
  if (footerText) footerText.textContent = settings.footerText || "© 2026 My Store - All rights reserved";
}

function renderSlider(slides) {
  const track = document.getElementById("sliderTrack");
  if (!track) return;

  if (!slides || !slides.length) {
    slides = [
      {
        title: "Welcome to Our Store",
        text: "Discover amazing products at great prices.",
        image: "assets/images/slide1.jpg"
      },
      {
        title: "Special Offers",
        text: "Check out our latest deals and discounts.",
        image: "assets/images/slide2.jpg"
      }
    ];
  }

  track.innerHTML = slides.map(slide => `
    <div class="slide" style="background-image:url('${slide.image || 'assets/images/placeholder.jpg'}')">
      <div class="slide-overlay">
        <div class="slide-content">
          <h2>${slide.title || ''}</h2>
          <p>${slide.text || ''}</p>
        </div>
      </div>
    </div>
  `).join("");

  currentSlideIndex = 0;
  updateSliderPosition();
  startAutoSlide();
}

function updateSliderPosition() {
  const track = document.getElementById("sliderTrack");
  if (!track) return;
  track.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
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
  sliderTimer = setInterval(nextSlide, 4000);
}

function renderCategories(categories) {
  const grid = document.getElementById("categoriesGrid");
  if (!grid) return;

  if (!categories || !categories.length) {
    categories = [
      { name: "Clothes" },
      { name: "Shoes" },
      { name: "Accessories" },
      { name: "Electronics" }
    ];
  }

  grid.innerHTML = categories.map(cat => `
    <div class="card category-card" style="text-align:center;padding:24px;">
      <h3>${cat.name}</h3>
    </div>
  `).join("");
}

function renderProducts(products, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!products || !products.length) {
    container.innerHTML = "<p class='small-note'>No products available</p>";
    return;
  }

  container.innerHTML = products.map(product => `
    <div class="card product-card">
      ${product.isSpecialOffer ? `<span class="badge sale">Special Offer</span>` : ""}
      ${product.isBestSeller ? `<span class="badge best">Best Seller</span>` : ""}
      <img src="${product.images?.[0] || 'assets/images/placeholder.jpg'}" alt="${product.name}" />
      <h3>${product.name || ''}</h3>
      <p style="color:var(--muted-color);font-size:14px;">${product.category || ''}</p>
      <div class="price-row">
        ${product.beforeDiscount ? `<span class="old-price">${product.beforeDiscount} DZD</span>` : ""}
        <strong style="font-size:20px;color:var(--accent-color);">${product.afterDiscount || product.price || 0} DZD</strong>
      </div>
      <p class="small-note">${product.mode === "rent" ? "🔁 Rent" : "🛒 Buy"}</p>
      <a href="product.html?id=${product.id}"><button style="width:100%;margin-top:10px;">View Product</button></a>
    </div>
  `).join("");
}

async function loadHomePage() {
  applyStoreSettings();

  try {
    // Load products
    const productsSnap = await db.collection("products").get();
    const products = [];
    productsSnap.forEach(doc => products.push({ id: doc.id, ...doc.data() }));

    // Load categories
    const categoriesSnap = await db.collection("categories").get();
    const categories = [];
    categoriesSnap.forEach(doc => categories.push({ id: doc.id, ...doc.data() }));

    // Load slides
    const slidesSnap = await db.collection("slides").get();
    const slides = [];
    slidesSnap.forEach(doc => slides.push({ id: doc.id, ...doc.data() }));

    renderSlider(slides);
    renderCategories(categories);

    const specialOffers = products.filter(p => p.isSpecialOffer);
    const bestSellers = products.filter(p => p.isBestSeller);

    renderProducts(specialOffers, "specialOffersGrid");
    renderProducts(bestSellers, "bestSellersGrid");
    renderProducts(products, "productsGrid");
  } catch (error) {
    console.error("Error loading home page:", error);
    // Fallback content
    renderSlider([]);
    renderCategories([]);
    renderProducts([], "specialOffersGrid");
    renderProducts([], "bestSellersGrid");
    renderProducts([], "productsGrid");
  }
}

function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  searchInput.addEventListener("input", async function () {
    const term = this.value.trim().toLowerCase();

    if (!term) {
      loadHomePage();
      return;
    }

    try {
      const productsSnap = await db.collection("products").get();
      const products = [];
      productsSnap.forEach(doc => products.push({ id: doc.id, ...doc.data() }));

      const filtered = products.filter(p =>
        (p.name || "").toLowerCase().includes(term) ||
        (p.category || "").toLowerCase().includes(term) ||
        (p.description || "").toLowerCase().includes(term)
      );

      renderProducts(filtered, "productsGrid");
      
      // Clear other sections when searching
      document.getElementById("specialOffersGrid").innerHTML = "";
      document.getElementById("bestSellersGrid").innerHTML = "";
    } catch (error) {
      console.error("Search error:", error);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadHomePage();
  setupSearch();

  const prevSlideBtn = document.getElementById("prevSlide");
  const nextSlideBtn = document.getElementById("nextSlide");

  if (prevSlideBtn) prevSlideBtn.addEventListener("click", prevSlide);
  if (nextSlideBtn) nextSlideBtn.addEventListener("click", nextSlide);
});