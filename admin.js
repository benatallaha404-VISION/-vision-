// =====================================
// ADMIN.JS - Full admin dashboard - FIXED
// =====================================

console.log("✅ Admin.js loaded");

if (typeof firebase !== "undefined" && firebase.apps.length === 0) {
  try {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized");
  } catch (error) {
    console.error("❌ Firebase init error:", error);
  }
}

const db = firebase.firestore();
// Note: we no longer use firebase.storage() — image uploads now go through Cloudinary (free, no credit card)

// ============================================
// HELPERS
// ============================================
function byId(id) { return document.getElementById(id); }
function safeValue(id, fallback = "") { const el = byId(id); return el ? el.value : fallback; }
function safeChecked(id) { const el = byId(id); return el ? el.checked : false; }

function showMessage(id, text, isSuccess = true) {
  const el = byId(id);
  if (!el) return;
  el.textContent = text;
  el.style.display = "block";
  el.style.color = isSuccess ? "#12813a" : "#dc3545";
  el.style.background = isSuccess ? "#eaf8ef" : "#ffecec";
  el.style.padding = "12px";
  el.style.borderRadius = "10px";
  el.style.margin = "10px 0";
  el.style.border = isSuccess ? "1px solid #12813a" : "1px solid #dc3545";
  setTimeout(() => el.style.display = "none", 8000);
}

// ============================================
// DROP ZONE
// ============================================
function setupDropZone(dropZoneId, fileInputId, previewId, multiple = true) {
  const dropZone = byId(dropZoneId);
  const fileInput = byId(fileInputId);
  const preview = byId(previewId);
  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    fileInput.files = e.dataTransfer.files;
    handleFiles(fileInput, preview, multiple);
  });
  fileInput.addEventListener('change', () => handleFiles(fileInput, preview, multiple));
}

function handleFiles(fileInput, preview, multiple) {
  if (!preview) return;
  const files = fileInput.files;
  if (files.length === 0) { preview.innerHTML = ''; return; }

  let html = '';
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const reader = new FileReader();
    reader.onload = function(e) {
      html += `<div class="preview-item"><img src="${e.target.result}" /><span class="remove-preview" onclick="removePreview(this, ${i})">×</span></div>`;
      preview.innerHTML = html;
    };
    reader.readAsDataURL(file);
  }
}

function removePreview(el, index) {
  const preview = el.closest('.image-preview-grid');
  if (!preview) return;
  const items = preview.querySelectorAll('.preview-item');
  if (items.length > index) items[index].remove();
  const dropZone = preview.closest('.form-group');
  if (dropZone) {
    const fileInput = dropZone.querySelector('input[type="file"]');
    if (fileInput && fileInput.files) {
      const dt = new DataTransfer();
      for (let i = 0; i < fileInput.files.length; i++) {
        if (i !== index) dt.items.add(fileInput.files[i]);
      }
      fileInput.files = dt.files;
    }
  }
}

// ============================================
// UPLOAD FUNCTIONS - FIXED
// ============================================
async function uploadToCloudinary(file) {
  if (!cloudinaryConfig.cloudName || cloudinaryConfig.cloudName === "YOUR_CLOUD_NAME" ||
      !cloudinaryConfig.uploadPreset || cloudinaryConfig.uploadPreset === "YOUR_UPLOAD_PRESET") {
    throw new Error("Cloudinary is not configured yet — add your real cloudName and uploadPreset in config.js");
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', cloudinaryConfig.uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    let message = `Cloudinary upload failed (HTTP ${response.status})`;
    try {
      const errData = await response.json();
      if (errData && errData.error && errData.error.message) message = errData.error.message;
    } catch (_) { /* ignore parse errors */ }
    throw new Error(message);
  }

  const data = await response.json();
  return data.secure_url;
}

async function uploadImages(files) {
  const urls = [];
  const errors = [];
  if (!files || files.length === 0) {
    return { urls, errors };
  }

  console.log(`📷 Uploading ${files.length} images...`);
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      console.log(`📤 Uploading: ${file.name} (${file.size} bytes)`);
      const url = await uploadToCloudinary(file);
      urls.push(url);
      console.log(`✅ URL: ${url}`);
    } catch (error) {
      // Log the real error instead of hiding it behind a placeholder image,
      // so the actual cause shows up in the admin panel
      console.error(`❌ Upload error for ${file.name}:`, error);
      errors.push({ file: file.name, code: error.code || '', message: error.message || String(error) });
    }
  }
  
  console.log(`✅ Total uploaded: ${urls.length} / ${files.length} images`);
  return { urls, errors };
}

async function uploadSlideImage(file) {
  // Throw the real error instead of returning null, so the actual cause shows in the on-screen message
  console.log(`📤 Uploading slide: ${file.name}`);
  const url = await uploadToCloudinary(file);
  console.log("✅ Slide image uploaded:", url);
  return url;
}

// ============================================
// DOM READY
// ============================================
document.addEventListener("DOMContentLoaded", function() {
  console.log("✅ DOM loaded");
  
  // Menu
  document.querySelectorAll(".menu-btn").forEach(btn => {
    btn.addEventListener("click", function() {
      document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("active"));
      const target = byId(this.dataset.target);
      if (target) target.classList.add("active");
    });
  });

  // Drop Zones
  setupDropZone('productDropZone', 'productImages', 'productImagePreview', true);
  setupDropZone('slideDropZone', 'slideImageFile', 'slideImagePreview', false);

  loadDesignInputs();
  loadIntegrationSettings();
  loadProductsAdmin();
  loadCategoriesAdmin();
  loadSlidesAdmin();
  loadOrdersAdmin();
  loadCouponsAdmin();
  loadShippingAdmin();
  loadCommentsAdmin();
  loadMonthlyProfits();
  setupEventListeners();
});

// ============================================
// DESIGN
// ============================================
function loadDesignInputs() {
  const saved = loadStoreSettings();
  const fields = [
    ["storeNameInput", saved.storeName],
    ["nicknameInput", saved.nickname],
    ["brandIdentityInput", saved.brandIdentity],
    ["primaryColorInput", saved.primaryColor],
    ["secondaryColorInput", saved.secondaryColor],
    ["accentColorInput", saved.accentColor],
    ["textColorInput", saved.textColor],
    ["logoUrlInput", saved.logoUrl],
    ["footerTextInput", saved.footerText],
    ["cardStyleInput", saved.cardStyle]
  ];
  fields.forEach(([id, value]) => { const el = byId(id); if (el) el.value = value || ""; });
}

// ============================================
// PRODUCTS
// ============================================
async function loadProductsAdmin() {
  const list = byId("productsAdminList");
  if (!list) return;
  try {
    const snap = await db.collection("products").orderBy("createdAt", "desc").get();
    const products = [];
    snap.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
    if (!products.length) { list.innerHTML = "<p class='small-note'>No products yet</p>"; return; }
    list.innerHTML = products.map(p => `
      <div class="card">
        <img src="${p.images && p.images.length > 0 ? p.images[0] : 'assets/images/placeholder.jpg'}" style="width:100%;height:180px;object-fit:cover;border-radius:12px;" />
        <h3>${p.name}</h3>
        <p>${p.category || "No category"}</p>
        <p><strong>${p.afterDiscount || p.price || 0} DZD</strong></p>
        <button onclick="deleteProduct('${p.id}')" style="background:#dc3545;padding:8px 16px;border:none;border-radius:8px;color:white;cursor:pointer;">Delete</button>
      </div>
    `).join("");
  } catch (error) { console.error("Error loading products:", error); }
}

async function deleteProduct(id) {
  if (!confirm("Delete this product?")) return;
  await db.collection("products").doc(id).delete();
  loadProductsAdmin();
}

// ============================================
// CATEGORIES
// ============================================
async function loadCategoriesAdmin() {
  const list = byId("categoriesAdminList");
  if (!list) return;
  try {
    const snap = await db.collection("categories").orderBy("createdAt", "desc").get();
    const items = [];
    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    const select = byId("productCategory");
    if (select) {
      const current = select.value;
      select.innerHTML = '<option value="">Select category</option>';
      items.forEach(c => { const opt = document.createElement('option'); opt.value = c.name; opt.textContent = c.name; select.appendChild(opt); });
      if (current) select.value = current;
    }
    if (!items.length) { list.innerHTML = "<p class='small-note'>No categories yet</p>"; return; }
    list.innerHTML = items.map(c => `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
        <strong>${c.name}</strong>
        <button onclick="deleteCategory('${c.id}')" style="background:#dc3545;padding:6px 12px;border:none;border-radius:8px;color:white;cursor:pointer;">Delete</button>
      </div>
    `).join("");
  } catch (error) { console.error("Error loading categories:", error); }
}

async function deleteCategory(id) {
  if (!confirm("Delete this category?")) return;
  await db.collection("categories").doc(id).delete();
  loadCategoriesAdmin();
}

// ============================================
// SLIDER
// ============================================
async function loadSlidesAdmin() {
  const list = byId("slidesAdminList");
  if (!list) return;
  try {
    const snap = await db.collection("slides").orderBy("createdAt", "desc").get();
    const items = [];
    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    if (!items.length) { list.innerHTML = "<p class='small-note'>No slides yet</p>"; return; }
    list.innerHTML = items.map(s => `
      <div class="card">
        <img src="${s.image || 'assets/images/placeholder.jpg'}" style="width:100%;height:160px;object-fit:cover;border-radius:12px;" />
        <h3>${s.title}</h3>
        <p>${s.text}</p>
        <button onclick="deleteSlide('${s.id}')" style="background:#dc3545;padding:8px 16px;border:none;border-radius:8px;color:white;cursor:pointer;">Delete</button>
      </div>
    `).join("");
  } catch (error) { console.error("Error loading slides:", error); }
}

async function deleteSlide(id) {
  if (!confirm("Delete this slide?")) return;
  await db.collection("slides").doc(id).delete();
  loadSlidesAdmin();
}

// ============================================
// ORDERS
// ============================================
async function loadOrdersAdmin() {
  const list = byId("ordersAdminList");
  if (!list) return;
  try {
    const snap = await db.collection("orders").orderBy("createdAt", "desc").get();
    const items = [];
    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    if (!items.length) { list.innerHTML = "<p class='small-note'>No orders yet</p>"; return; }
    const colors = { pending: "#ffc107", done: "#28a745", rejected: "#dc3545", returned: "#fd7e14" };
    list.innerHTML = items.map(o => `
      <div class="card">
        <h3>${o.fullName}</h3>
        <p><strong>Product:</strong> ${o.productName}</p>
        <p><strong>Phone:</strong> ${o.phone}</p>
        <p><strong>Date:</strong> ${o.orderDate || formatDate(o.createdAt)}</p>
        <p><strong>Status:</strong> <span style="color:${colors[o.status] || '#333'}">${o.status}</span></p>
        <p><strong>Total:</strong> ${o.total} DZD</p>
        <select onchange="updateOrderStatus('${o.id}', this.value)" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd;margin-top:10px;">
          <option value="pending" ${o.status === "pending" ? "selected" : ""}>Pending</option>
          <option value="done" ${o.status === "done" ? "selected" : ""}>Done</option>
          <option value="rejected" ${o.status === "rejected" ? "selected" : ""}>Rejected</option>
          <option value="returned" ${o.status === "returned" ? "selected" : ""}>Returned</option>
        </select>
      </div>
    `).join("");
    loadMonthlyProfits();
  } catch (error) { console.error("Error loading orders:", error); }
}

async function updateOrderStatus(id, status) {
  await db.collection("orders").doc(id).update({ status });
  loadOrdersAdmin();
}

// ============================================
// PROFITS
// ============================================
async function loadMonthlyProfits() {
  const container = byId("monthlyProfits");
  if (!container) return;
  try {
    const snap = await db.collection("orders").get();
    const orders = [];
    snap.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
    const done = orders.filter(o => o.status === "done");
    if (!done.length) { container.innerHTML = "<p class='small-note'>No completed orders yet</p>"; return; }
    const monthly = {};
    done.forEach(o => {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!monthly[key]) monthly[key] = { month: getMonthName(d.getMonth()), year: d.getFullYear(), total: 0, orders: 0 };
      monthly[key].total += Number(o.total || 0);
      monthly[key].orders += 1;
    });
    const total = done.reduce((s, o) => s + Number(o.total || 0), 0);
    let html = `<div class="card" style="background:linear-gradient(135deg,#e774b7,#d95a9e);color:white;text-align:center;padding:30px;border-radius:16px;">
      <h2>💰 Total Profit</h2>
      <h1 style="font-size:48px;">${total.toLocaleString()} DZD</h1>
      <p>From ${done.length} completed orders</p>
    </div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-top:20px;">`;
    Object.keys(monthly).sort().forEach(key => {
      const d = monthly[key];
      html += `<div class="card" style="text-align:center;padding:20px;border-left:4px solid #e774b7;">
        <h3>${d.month} ${d.year}</h3>
        <p style="font-size:24px;font-weight:bold;color:#e774b7;">${d.total.toLocaleString()} DZD</p>
        <p class="small-note">${d.orders} orders</p>
        <div style="width:100%;height:4px;background:#e9ecef;border-radius:2px;margin-top:10px;">
          <div style="width:${Math.min((d.total/total)*100,100)}%;height:4px;background:#e774b7;border-radius:2px;"></div>
        </div>
      </div>`;
    });
    container.innerHTML = html + "</div>";
  } catch (error) { console.error("Error loading profits:", error); }
}

// ============================================
// COUPONS
// ============================================
async function loadCouponsAdmin() {
  const list = byId("couponsAdminList");
  if (!list) return;
  try {
    const snap = await db.collection("coupons").get();
    const items = [];
    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    if (!items.length) { list.innerHTML = "<p class='small-note'>No coupons yet</p>"; return; }
    list.innerHTML = items.map(c => `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
        <div><strong>${c.code}</strong> - ${c.value} DZD</div>
        <button onclick="deleteCoupon('${c.id}')" style="background:#dc3545;padding:6px 12px;border:none;border-radius:8px;color:white;cursor:pointer;">Delete</button>
      </div>
    `).join("");
  } catch (error) { console.error("Error loading coupons:", error); }
}

async function deleteCoupon(id) {
  if (!confirm("Delete this coupon?")) return;
  await db.collection("coupons").doc(id).delete();
  loadCouponsAdmin();
}

// ============================================
// SHIPPING
// ============================================
async function loadShippingAdmin() {
  const list = byId("shippingAdminList");
  if (!list) return;
  try {
    const snap = await db.collection("shipping").get();
    const items = [];
    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    if (!items.length) { list.innerHTML = "<p class='small-note'>No shipping rules yet</p>"; return; }
    list.innerHTML = items.map(s => `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
        <div><strong>${s.state}</strong> - ${s.free ? "Free" : s.price + " DZD"}</div>
        <button onclick="deleteShipping('${s.id}')" style="background:#dc3545;padding:6px 12px;border:none;border-radius:8px;color:white;cursor:pointer;">Delete</button>
      </div>
    `).join("");
  } catch (error) { console.error("Error loading shipping:", error); }
}

async function deleteShipping(id) {
  if (!confirm("Delete this shipping rule?")) return;
  await db.collection("shipping").doc(id).delete();
  loadShippingAdmin();
}

// ============================================
// COMMENTS
// ============================================
async function loadCommentsAdmin() {
  const list = byId("commentsAdminList");
  if (!list) return;
  try {
    const snap = await db.collection("comments").orderBy("createdAt", "desc").get();
    const items = [];
    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    if (!items.length) { list.innerHTML = "<p class='small-note'>No comments yet</p>"; return; }
    list.innerHTML = items.map(c => `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
        <div><strong>${c.name}</strong><br />${c.text}<br /><small>${c.rating || 0}★</small></div>
        <button onclick="deleteComment('${c.id}')" style="background:#dc3545;padding:6px 12px;border:none;border-radius:8px;color:white;cursor:pointer;">Delete</button>
      </div>
    `).join("");
  } catch (error) { console.error("Error loading comments:", error); }
}

async function deleteComment(id) {
  if (!confirm("Delete this comment?")) return;
  await db.collection("comments").doc(id).delete();
  loadCommentsAdmin();
}

// ============================================
// SETTINGS
// ============================================
function loadIntegrationSettings() {
  byId("firebaseConfigBox").value = localStorage.getItem("firebaseConfigBox") || "";
  byId("emailjsConfigBox").value = localStorage.getItem("emailjsConfigBox") || "";
  byId("googleSheetsBox").value = localStorage.getItem("googleSheetsBox") || "";
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  console.log("🔧 Setting up event listeners...");

  // ===== DESIGN =====
  byId("saveDesignBtn").addEventListener("click", function() {
    const settings = {
      storeName: safeValue("storeNameInput"),
      nickname: safeValue("nicknameInput"),
      brandIdentity: safeValue("brandIdentityInput"),
      primaryColor: safeValue("primaryColorInput", "#e774b7"),
      secondaryColor: safeValue("secondaryColorInput", "#fce4f4"),
      accentColor: safeValue("accentColorInput", "#e774b7"),
      textColor: safeValue("textColorInput", "#1a1a2e"),
      logoUrl: safeValue("logoUrlInput"),
      footerText: safeValue("footerTextInput"),
      cardStyle: safeValue("cardStyleInput", "classic"),
      currency: "DZD"
    };
    saveStoreSettings(settings);
    showMessage("designMessage", "✅ Design saved!");
  });

  // ==========================================
  // SAVE PRODUCT - FIXED
  // ==========================================
  const productForm = byId("productForm");
  if (productForm) {
    productForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      
      const submitBtn = this.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "⏳ Saving...";
      
      showMessage("productMessage", "⏳ Processing...", true);

      try {
        // Get form values
        const name = safeValue("productName").trim();
        const description = safeValue("productDescription").trim();
        const price = Number(safeValue("productPrice", 0));
        const beforeDiscount = Number(safeValue("productBeforeDiscount", 0));
        const afterDiscount = Number(safeValue("productAfterDiscount", 0));
        const mode = safeValue("productMode", "buy");
        const stock = Number(safeValue("productStock", 0));
        const sizes = safeValue("productSizes");
        const colors = safeValue("productColors");
        const category = safeValue("productCategory");
        const isBestSeller = safeChecked("isBestSeller");
        const isSpecialOffer = safeChecked("isSpecialOffer");

        // Validate
        if (!name) {
          showMessage("productMessage", "❌ Product name is required!", false);
          submitBtn.disabled = false;
          submitBtn.textContent = "💾 Save Product";
          return;
        }
        if (!description) {
          showMessage("productMessage", "❌ Description is required!", false);
          submitBtn.disabled = false;
          submitBtn.textContent = "💾 Save Product";
          return;
        }
        if (!price || price <= 0) {
          showMessage("productMessage", "❌ Valid price is required!", false);
          submitBtn.disabled = false;
          submitBtn.textContent = "💾 Save Product";
          return;
        }

        // Get images
        const fileInput = byId("productImages");
        const files = fileInput ? fileInput.files : [];
        
        if (!files || files.length === 0) {
          showMessage("productMessage", "❌ Please upload at least one image!", false);
          submitBtn.disabled = false;
          submitBtn.textContent = "💾 Save Product";
          return;
        }

        // Upload images
        showMessage("productMessage", "⏳ Uploading images...", true);
        const uploadResult = await uploadImages(files);
        const imageUrls = uploadResult.urls;
        console.log("📷 Image URLs:", imageUrls, "Errors:", uploadResult.errors);
        
        if (!imageUrls || imageUrls.length === 0) {
          const firstError = uploadResult.errors[0];
          const reason = firstError ? `${firstError.code || ''} ${firstError.message}`.trim() : "unknown error";
          showMessage("productMessage", `❌ Failed to upload images (${reason}). Check your Cloudinary cloudName/uploadPreset in config.js.`, false);
          submitBtn.disabled = false;
          submitBtn.textContent = "💾 Save Product";
          return;
        }
        if (uploadResult.errors.length > 0) {
          console.warn(`⚠️ ${uploadResult.errors.length} of ${files.length} images failed to upload:`, uploadResult.errors);
        }

        // Save product
        showMessage("productMessage", "⏳ Saving to database...", true);
        
        const productData = {
          name: name,
          description: description,
          images: imageUrls,
          price: price,
          beforeDiscount: beforeDiscount || 0,
          afterDiscount: afterDiscount || price,
          mode: mode,
          stock: stock || 0,
          sizes: sizes || "",
          colors: colors || "",
          category: category || "",
          isBestSeller: isBestSeller,
          isSpecialOffer: isSpecialOffer,
          averageRating: 0,
          reviewCount: 0,
          createdAt: new Date().toISOString()
        };

        console.log("📦 Saving product:", productData);
        
        const docRef = await db.collection("products").add(productData);
        console.log("✅ Product saved with ID:", docRef.id);

        showMessage("productMessage", "✅ Product saved successfully!", true);
        
        // Reset form
        this.reset();
        byId("productImagePreview").innerHTML = "";
        if (fileInput) fileInput.value = "";
        
        // Reload products
        loadProductsAdmin();
        
      } catch (error) {
        console.error("❌ Product save error:", error);
        showMessage("productMessage", "❌ Error: " + error.message, false);
      }

      submitBtn.disabled = false;
      submitBtn.textContent = "💾 Save Product";
    });
  }

  // ==========================================
  // ADD CATEGORY
  // ==========================================
  byId("addCategoryBtn").addEventListener("click", async function() {
    const name = safeValue("categoryName").trim();
    if (!name) { showMessage("categoryMessage", "❌ Enter category name", false); return; }
    await db.collection("categories").add({ name, createdAt: new Date().toISOString() });
    byId("categoryName").value = "";
    showMessage("categoryMessage", "✅ Category added!");
    loadCategoriesAdmin();
  });

  // ==========================================
  // ADD SLIDE - FIXED
  // ==========================================
  byId("addSlideBtn").addEventListener("click", async function() {
    const title = safeValue("slideTitle").trim();
    const text = safeValue("slideText").trim();
    const fileInput = byId("slideImageFile");
    const file = fileInput ? fileInput.files[0] : null;

    if (!title || !text) {
      showMessage("slideMessage", "❌ Title and text are required!", false);
      return;
    }
    if (!file) {
      showMessage("slideMessage", "❌ Please upload an image!", false);
      return;
    }

    const btn = this;
    btn.disabled = true;
    btn.textContent = "⏳ Saving...";

    try {
      const imageUrl = await uploadSlideImage(file);
      await db.collection("slides").add({ 
        title, 
        text, 
        image: imageUrl, 
        createdAt: new Date().toISOString() 
      });
      byId("slideTitle").value = "";
      byId("slideText").value = "";
      if (fileInput) fileInput.value = "";
      byId("slideImagePreview").innerHTML = "";
      showMessage("slideMessage", "✅ Slide added!");
      loadSlidesAdmin();
    } catch (error) {
      console.error("❌ Slide error:", error);
      showMessage("slideMessage", "❌ Error: " + error.message, false);
    }
    btn.disabled = false;
    btn.textContent = "➕ Add Slide";
  });

  // ==========================================
  // ADD COUPON
  // ==========================================
  byId("addCouponBtn").addEventListener("click", async function() {
    const code = safeValue("couponName").trim().toUpperCase();
    const value = Number(safeValue("couponValue", 0));
    if (!code || !value) { showMessage("couponMessage", "❌ Enter code and value", false); return; }
    await db.collection("coupons").add({ code, value, createdAt: new Date().toISOString() });
    byId("couponName").value = "";
    byId("couponValue").value = "";
    showMessage("couponMessage", "✅ Coupon added!");
    loadCouponsAdmin();
  });

  // ==========================================
  // SAVE SHIPPING
  // ==========================================
  byId("saveShippingBtn").addEventListener("click", async function() {
    const state = safeValue("shippingState").trim();
    const price = Number(safeValue("shippingPrice", 0));
    if (!state) { showMessage("shippingMessage", "❌ Enter state name", false); return; }
    await db.collection("shipping").add({ 
      state, 
      price, 
      free: safeChecked("shippingFree"), 
      createdAt: new Date().toISOString() 
    });
    byId("shippingState").value = "";
    byId("shippingPrice").value = "";
    byId("shippingFree").checked = false;
    showMessage("shippingMessage", "✅ Shipping rule added!");
    loadShippingAdmin();
  });

  // ==========================================
  // INTEGRATION SETTINGS
  // ==========================================
  byId("saveIntegrationBtn").addEventListener("click", function() {
    localStorage.setItem("firebaseConfigBox", safeValue("firebaseConfigBox"));
    localStorage.setItem("emailjsConfigBox", safeValue("emailjsConfigBox"));
    localStorage.setItem("googleSheetsBox", safeValue("googleSheetsBox"));
    showMessage("settingsMessage", "✅ Settings saved!");
  });
}

// ============================================
// EXPOSE
// ============================================
window.deleteProduct = deleteProduct;
window.deleteCategory = deleteCategory;
window.deleteSlide = deleteSlide;
window.updateOrderStatus = updateOrderStatus;
window.deleteCoupon = deleteCoupon;
window.deleteShipping = deleteShipping;
window.deleteComment = deleteComment;
window.removePreview = removePreview;

console.log("✅ Admin.js ready!");