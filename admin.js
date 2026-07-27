// =====================================
// ADMIN.JS - Full admin dashboard
// =====================================

console.log("✅ Admin.js loaded");

// Initialize Firebase
if (typeof firebase !== "undefined" && firebase.apps.length === 0) {
  try {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized");
  } catch (error) {
    console.error("❌ Firebase init error:", error);
  }
}

const db = firebase.firestore();
const storage = firebase.storage();

// Helper functions
function byId(id) {
  return document.getElementById(id);
}

function safeValue(id, fallback = "") {
  const el = byId(id);
  return el ? el.value : fallback;
}

function safeChecked(id) {
  const el = byId(id);
  return el ? el.checked : false;
}

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
  setTimeout(() => {
    el.style.display = "none";
  }, 6000);
}

// ============================================
// DOM READY
// ============================================
document.addEventListener("DOMContentLoaded", function() {
  console.log("✅ DOM loaded");
  
  // Menu navigation
  const menuButtons = document.querySelectorAll(".menu-btn");
  const panels = document.querySelectorAll(".admin-panel");

  menuButtons.forEach(btn => {
    btn.addEventListener("click", function() {
      menuButtons.forEach(b => b.classList.remove("active"));
      this.classList.add("active");

      panels.forEach(panel => panel.classList.remove("active"));

      const target = byId(this.dataset.target);
      if (target) target.classList.add("active");
    });
  });

  // Load all data
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

  // Setup event listeners
  setupEventListeners();
});

// ============================================
// DESIGN FUNCTIONS
// ============================================
function loadDesignInputs() {
  try {
    const saved = loadStoreSettings();
    console.log("📝 Loading design settings:", saved);

    const fields = [
      ["storeNameInput", saved.storeName],
      ["nicknameInput", saved.nickname],
      ["brandIdentityInput", saved.brandIdentity],
      ["primaryColorInput", saved.primaryColor],
      ["secondaryColorInput", saved.secondaryColor],
      ["accentColorInput", saved.accentColor],
      ["logoUrlInput", saved.logoUrl],
      ["footerTextInput", saved.footerText]
    ];

    fields.forEach(([id, value]) => {
      const el = byId(id);
      if (el) {
        el.value = value || "";
        console.log(`✅ Loaded ${id}:`, value);
      }
    });
  } catch (error) {
    console.error("❌ Error loading design:", error);
  }
}

// ============================================
// PRODUCT FUNCTIONS
// ============================================
async function uploadImages(files) {
  const urls = [];
  if (!files || files.length === 0) {
    console.log("📷 No images to upload");
    return urls;
  }

  console.log(`📷 Uploading ${files.length} images...`);
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const fileName = `products/${Date.now()}_${i}_${file.name}`;
      const fileRef = storage.ref(fileName);
      
      console.log(`📤 Uploading: ${file.name}`);
      const snapshot = await fileRef.put(file);
      const url = await snapshot.ref.getDownloadURL();
      urls.push(url);
      console.log(`✅ Uploaded image ${i+1}:`, url);
    } catch (error) {
      console.error(`❌ Upload error for ${file.name}:`, error);
    }
  }
  
  return urls;
}

// Upload slide image
async function uploadSlideImage(file) {
  try {
    const fileName = `slides/${Date.now()}_${file.name}`;
    const fileRef = storage.ref(fileName);
    const snapshot = await fileRef.put(file);
    const url = await snapshot.ref.getDownloadURL();
    return url;
  } catch (error) {
    console.error("❌ Slide upload error:", error);
    return null;
  }
}

async function loadProductsAdmin() {
  const list = byId("productsAdminList");
  if (!list) return;

  try {
    console.log("📦 Loading products...");
    const snap = await db.collection("products").orderBy("createdAt", "desc").get();
    const products = [];
    snap.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
    console.log(`✅ Loaded ${products.length} products`);

    if (!products.length) {
      list.innerHTML = "<p class='small-note'>No products yet</p>";
      return;
    }

    list.innerHTML = products.map(item => `
      <div class="card">
        <img src="${item.images && item.images.length > 0 ? item.images[0] : 'assets/images/placeholder.jpg'}" alt="${item.name || 'Product'}" style="width:100%;height:180px;object-fit:cover;border-radius:12px;" />
        <h3>${item.name || "Unnamed"}</h3>
        <p style="color:#666;">${item.category || "No category"}</p>
        <p><strong>${item.afterDiscount || item.price || 0} DZD</strong></p>
        <button onclick="deleteProduct('${item.id}')" style="background:#dc3545;margin-top:10px;padding:8px 16px;">🗑️ Delete</button>
      </div>
    `).join("");
  } catch (error) {
    console.error("❌ Error loading products:", error);
    list.innerHTML = "<p class='small-note'>Error loading products: " + error.message + "</p>";
  }
}

async function deleteProduct(id) {
  if (!confirm("Delete this product?")) return;
  try {
    await db.collection("products").doc(id).delete();
    showMessage("productMessage", "✅ Product deleted successfully!");
    loadProductsAdmin();
  } catch (error) {
    showMessage("productMessage", "❌ Error deleting product: " + error.message, false);
    console.error("❌ Delete error:", error);
  }
}

// ============================================
// CATEGORY FUNCTIONS
// ============================================
async function loadCategoriesAdmin() {
  const list = byId("categoriesAdminList");
  if (!list) return;

  try {
    console.log("📂 Loading categories...");
    const snap = await db.collection("categories").orderBy("createdAt", "desc").get();
    const items = [];
    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    console.log(`✅ Loaded ${items.length} categories`);

    // Also update category dropdown in product form
    const categorySelect = byId("productCategory");
    if (categorySelect) {
      const currentValue = categorySelect.value;
      categorySelect.innerHTML = '<option value="">Select category</option>';
      items.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        categorySelect.appendChild(option);
      });
      if (currentValue) categorySelect.value = currentValue;
    }

    if (!items.length) {
      list.innerHTML = "<p class='small-note'>No categories yet</p>";
      return;
    }

    list.innerHTML = items.map(cat => `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
        <p><strong>${cat.name || "Unnamed"}</strong></p>
        <button onclick="deleteCategory('${cat.id}')" style="background:#dc3545;padding:6px 12px;">🗑️</button>
      </div>
    `).join("");
  } catch (error) {
    console.error("❌ Error loading categories:", error);
    list.innerHTML = "<p class='small-note'>Error loading categories</p>";
  }
}

async function deleteCategory(id) {
  if (!confirm("Delete this category?")) return;
  try {
    await db.collection("categories").doc(id).delete();
    showMessage("categoryMessage", "✅ Category deleted successfully!");
    loadCategoriesAdmin();
  } catch (error) {
    showMessage("categoryMessage", "❌ Error deleting category", false);
    console.error("❌ Delete error:", error);
  }
}

// ============================================
// SLIDER FUNCTIONS - WITH IMAGE UPLOAD
// ============================================
async function loadSlidesAdmin() {
  const list = byId("slidesAdminList");
  if (!list) return;

  try {
    console.log("🖼️ Loading slides...");
    const snap = await db.collection("slides").orderBy("createdAt", "desc").get();
    const items = [];
    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    console.log(`✅ Loaded ${items.length} slides`);

    if (!items.length) {
      list.innerHTML = "<p class='small-note'>No slides yet</p>";
      return;
    }

    list.innerHTML = items.map(slide => `
      <div class="card">
        <img src="${slide.image || 'assets/images/placeholder.jpg'}" alt="${slide.title || ''}" style="width:100%;height:160px;object-fit:cover;border-radius:12px;" />
        <h3>${slide.title || "Untitled"}</h3>
        <p>${slide.text || ""}</p>
        <button onclick="deleteSlide('${slide.id}')" style="background:#dc3545;margin-top:10px;">🗑️ Delete</button>
      </div>
    `).join("");
  } catch (error) {
    console.error("❌ Error loading slides:", error);
    list.innerHTML = "<p class='small-note'>Error loading slides</p>";
  }
}

async function deleteSlide(id) {
  if (!confirm("Delete this slide?")) return;
  try {
    await db.collection("slides").doc(id).delete();
    showMessage("slideMessage", "✅ Slide deleted successfully!");
    loadSlidesAdmin();
  } catch (error) {
    showMessage("slideMessage", "❌ Error deleting slide", false);
    console.error("❌ Delete error:", error);
  }
}

// ============================================
// ORDER FUNCTIONS WITH MONTHLY PROFITS
// ============================================
async function loadOrdersAdmin() {
  const list = byId("ordersAdminList");
  if (!list) return;

  try {
    console.log("📋 Loading orders...");
    const snap = await db.collection("orders").orderBy("createdAt", "desc").get();
    const items = [];
    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    console.log(`✅ Loaded ${items.length} orders`);

    if (!items.length) {
      list.innerHTML = "<p class='small-note'>No orders yet</p>";
      return;
    }

    list.innerHTML = items.map(order => {
      const statusColors = {
        pending: "#ffc107",
        done: "#28a745",
        rejected: "#dc3545",
        returned: "#fd7e14"
      };
      return `
      <div class="card">
        <h3>👤 ${order.fullName || "Anonymous"}</h3>
        <p><strong>Product:</strong> ${order.productName || "-"}</p>
        <p><strong>Phone:</strong> ${order.phone || "-"}</p>
        <p><strong>State:</strong> ${order.state || "-"}</p>
        <p><strong>Date:</strong> ${order.orderDate || formatDate(order.createdAt) || "-"}</p>
        <p><strong>Status:</strong> <span style="color:${statusColors[order.status] || '#333'};font-weight:bold;">${order.status || "pending"}</span></p>
        <p><strong>Transaction:</strong> ${order.transactionNumber || "-"}</p>
        <p><strong>Total:</strong> ${order.total || 0} DZD</p>
        <select onchange="updateOrderStatus('${order.id}', this.value)" style="margin-top:10px;width:100%;padding:8px;border-radius:8px;border:1px solid #ddd;">
          <option value="pending" ${order.status === "pending" ? "selected" : ""}>⏳ Pending</option>
          <option value="done" ${order.status === "done" ? "selected" : ""}>✅ Done</option>
          <option value="rejected" ${order.status === "rejected" ? "selected" : ""}>❌ Rejected</option>
          <option value="returned" ${order.status === "returned" ? "selected" : ""}>🔄 Returned</option>
        </select>
      </div>
    `}).join("");

    // Load monthly profits
    loadMonthlyProfits();

  } catch (error) {
    console.error("❌ Error loading orders:", error);
    list.innerHTML = "<p class='small-note'>Error loading orders</p>";
  }
}

async function updateOrderStatus(id, status) {
  try {
    await db.collection("orders").doc(id).update({ status });
    showMessage("orderMessage", "✅ Order status updated!");
    loadOrdersAdmin();
  } catch (error) {
    console.error("❌ Update error:", error);
  }
}

// ============================================
// MONTHLY PROFITS
// ============================================
async function loadMonthlyProfits() {
  const container = byId("monthlyProfits");
  if (!container) return;

  try {
    console.log("💰 Loading monthly profits...");
    const snap = await db.collection("orders").get();
    const orders = [];
    snap.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));

    // Filter only done orders
    const doneOrders = orders.filter(order => order.status === "done");
    
    // Group by month
    const monthlyData = {};
    doneOrders.forEach(order => {
      const date = new Date(order.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = getMonthName(date.getMonth());
      const year = date.getFullYear();
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthName,
          year: year,
          total: 0,
          orders: 0
        };
      }
      monthlyData[monthKey].total += Number(order.total || 0);
      monthlyData[monthKey].orders += 1;
    });

    // Sort by month
    const sortedMonths = Object.keys(monthlyData).sort();
    
    if (sortedMonths.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align:center;padding:40px;">
          <p class="small-note">No completed orders yet</p>
        </div>
      `;
      return;
    }

    // Calculate total profit
    const totalProfit = doneOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

    let html = `
      <div class="profits-summary">
        <div class="card" style="background:linear-gradient(135deg,#28a745,#20c997);color:white;text-align:center;padding:30px;margin-bottom:20px;">
          <h2>💰 Total Profit</h2>
          <h1 style="font-size:48px;">${totalProfit.toLocaleString()} DZD</h1>
          <p>From ${doneOrders.length} completed orders</p>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;">
    `;

    sortedMonths.forEach(monthKey => {
      const data = monthlyData[monthKey];
      const profitClass = data.total > 0 ? 'profit-positive' : 'profit-neutral';
      html += `
        <div class="card ${profitClass}" style="text-align:center;padding:20px;border-left:4px solid ${data.total > 0 ? '#28a745' : '#ffc107'};">
          <h3>${data.month} ${data.year}</h3>
          <p style="font-size:24px;font-weight:bold;color:${data.total > 0 ? '#28a745' : '#ffc107'};">${data.total.toLocaleString()} DZD</p>
          <p class="small-note">${data.orders} orders</p>
          <div style="width:100%;height:4px;background:#e9ecef;border-radius:2px;margin-top:10px;">
            <div style="width:${Math.min((data.total / totalProfit) * 100, 100)}%;height:4px;background:${data.total > 0 ? '#28a745' : '#ffc107'};border-radius:2px;"></div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error("❌ Error loading profits:", error);
    container.innerHTML = "<p class='small-note'>Error loading profits</p>";
  }
}

// ============================================
// COUPON FUNCTIONS
// ============================================
async function loadCouponsAdmin() {
  const list = byId("couponsAdminList");
  if (!list) return;

  try {
    console.log("🏷️ Loading coupons...");
    const snap = await db.collection("coupons").orderBy("createdAt", "desc").get();
    const items = [];
    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    console.log(`✅ Loaded ${items.length} coupons`);

    if (!items.length) {
      list.innerHTML = "<p class='small-note'>No coupons yet</p>";
      return;
    }

    list.innerHTML = items.map(coupon => `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <h3>🏷️ ${coupon.code || ""}</h3>
          <p>Discount: ${coupon.value || 0} DZD</p>
        </div>
        <button onclick="deleteCoupon('${coupon.id}')" style="background:#dc3545;">🗑️</button>
      </div>
    `).join("");
  } catch (error) {
    console.error("❌ Error loading coupons:", error);
    list.innerHTML = "<p class='small-note'>Error loading coupons</p>";
  }
}

async function deleteCoupon(id) {
  if (!confirm("Delete this coupon?")) return;
  try {
    await db.collection("coupons").doc(id).delete();
    showMessage("couponMessage", "✅ Coupon deleted successfully!");
    loadCouponsAdmin();
  } catch (error) {
    showMessage("couponMessage", "❌ Error deleting coupon", false);
    console.error("❌ Delete error:", error);
  }
}

// ============================================
// SHIPPING FUNCTIONS
// ============================================
async function loadShippingAdmin() {
  const list = byId("shippingAdminList");
  if (!list) return;

  try {
    console.log("🚚 Loading shipping rules...");
    const snap = await db.collection("shipping").orderBy("createdAt", "desc").get();
    const items = [];
    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    console.log(`✅ Loaded ${items.length} shipping rules`);

    if (!items.length) {
      list.innerHTML = "<p class='small-note'>No shipping rules yet</p>";
      return;
    }

    list.innerHTML = items.map(item => `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <h3>📍 ${item.state || ""}</h3>
          <p>Price: ${item.free ? "🆓 Free" : (item.price + " DZD")}</p>
        </div>
        <button onclick="deleteShipping('${item.id}')" style="background:#dc3545;">🗑️</button>
      </div>
    `).join("");
  } catch (error) {
    console.error("❌ Error loading shipping:", error);
    list.innerHTML = "<p class='small-note'>Error loading shipping</p>";
  }
}

async function deleteShipping(id) {
  if (!confirm("Delete this shipping rule?")) return;
  try {
    await db.collection("shipping").doc(id).delete();
    showMessage("shippingMessage", "✅ Shipping rule deleted!");
    loadShippingAdmin();
  } catch (error) {
    showMessage("shippingMessage", "❌ Error deleting shipping rule", false);
    console.error("❌ Delete error:", error);
  }
}

// ============================================
// COMMENT FUNCTIONS
// ============================================
async function loadCommentsAdmin() {
  const list = byId("commentsAdminList");
  if (!list) return;

  try {
    console.log("💬 Loading comments...");
    const snap = await db.collection("comments").orderBy("createdAt", "desc").get();
    const items = [];
    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    console.log(`✅ Loaded ${items.length} comments`);

    if (!items.length) {
      list.innerHTML = "<p class='small-note'>No comments yet</p>";
      return;
    }

    list.innerHTML = items.map(comment => `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <h3>👤 ${comment.name || "Anonymous"}</h3>
          <p>${comment.text || ""}</p>
          <p class="small-note">Product: ${comment.productId || "-"}</p>
        </div>
        <button onclick="deleteComment('${comment.id}')" style="background:#dc3545;">🗑️</button>
      </div>
    `).join("");
  } catch (error) {
    console.error("❌ Error loading comments:", error);
    list.innerHTML = "<p class='small-note'>Error loading comments</p>";
  }
}

async function deleteComment(id) {
  if (!confirm("Delete this comment?")) return;
  try {
    await db.collection("comments").doc(id).delete();
    loadCommentsAdmin();
  } catch (error) {
    console.error("❌ Delete error:", error);
  }
}

// ============================================
// INTEGRATION SETTINGS
// ============================================
function loadIntegrationSettings() {
  const firebaseBox = byId("firebaseConfigBox");
  const emailjsBox = byId("emailjsConfigBox");
  const sheetsBox = byId("googleSheetsBox");

  if (firebaseBox) firebaseBox.value = localStorage.getItem("firebaseConfigBox") || "";
  if (emailjsBox) emailjsBox.value = localStorage.getItem("emailjsConfigBox") || "";
  if (sheetsBox) sheetsBox.value = localStorage.getItem("googleSheetsBox") || "";
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  console.log("🔧 Setting up event listeners...");

  // Save Design
  const saveDesignBtn = byId("saveDesignBtn");
  if (saveDesignBtn) {
    saveDesignBtn.addEventListener("click", function() {
      try {
        const newSettings = {
          storeName: safeValue("storeNameInput"),
          nickname: safeValue("nicknameInput"),
          brandIdentity: safeValue("brandIdentityInput"),
          currency: "DZD",
          primaryColor: safeValue("primaryColorInput", "#111111"),
          secondaryColor: safeValue("secondaryColorInput", "#ffffff"),
          accentColor: safeValue("accentColorInput", "#ff6b00"),
          logoUrl: safeValue("logoUrlInput"),
          footerText: safeValue("footerTextInput")
        };

        saveStoreSettings(newSettings);
        showMessage("designMessage", "✅ Design saved successfully!");
        console.log("✅ Design saved:", newSettings);
      } catch (error) {
        showMessage("designMessage", "❌ Error saving design: " + error.message, false);
        console.error("❌ Design save error:", error);
      }
    });
  }

  // Save Product
  const productForm = byId("productForm");
  if (productForm) {
    productForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      
      showMessage("productMessage", "⏳ Saving product...", true);
      
      try {
        const name = safeValue("productName").trim();
        const description = safeValue("productDescription").trim();
        const price = Number(safeValue("productPrice", 0));
        const beforeDiscount = Number(safeValue("productBeforeDiscount", 0));
        const afterDiscount = Number(safeValue("productAfterDiscount", 0));
        const discountPercent = Number(safeValue("productDiscountPercent", 0));
        const mode = safeValue("productMode", "buy");
        const stock = Number(safeValue("productStock", 0));
        const sizes = safeValue("productSizes");
        const colors = safeValue("productColors");
        const category = safeValue("productCategory");
        const isBestSeller = safeChecked("isBestSeller");
        const isSpecialOffer = safeChecked("isSpecialOffer");
        
        if (!name) {
          showMessage("productMessage", "❌ Product name is required!", false);
          return;
        }
        if (!description) {
          showMessage("productMessage", "❌ Product description is required!", false);
          return;
        }
        if (!price || price <= 0) {
          showMessage("productMessage", "❌ Valid price is required!", false);
          return;
        }

        console.log("📦 Form data:", { name, description, price, mode, category });

        const filesInput = byId("productImages");
        const files = filesInput ? filesInput.files : [];
        let imageUrls = [];
        
        if (files && files.length > 0) {
          imageUrls = await uploadImages(files);
          console.log("✅ Images uploaded:", imageUrls);
        } else {
          console.log("📷 No images selected, using placeholder");
          imageUrls = ["assets/images/placeholder.jpg"];
        }

        const productData = {
          name: name,
          description: description,
          images: imageUrls,
          price: price,
          beforeDiscount: beforeDiscount || 0,
          afterDiscount: afterDiscount || price,
          discountPercent: discountPercent || 0,
          mode: mode,
          stock: stock || 0,
          sizes: sizes || "",
          colors: colors || "",
          category: category || "",
          isBestSeller: isBestSeller,
          isSpecialOffer: isSpecialOffer,
          createdAt: new Date().toISOString()
        };

        console.log("📦 Saving product:", productData);
        
        const docRef = await db.collection("products").add(productData);
        console.log("✅ Product saved with ID:", docRef.id);
        
        showMessage("productMessage", "✅ Product saved successfully!");
        productForm.reset();
        if (filesInput) filesInput.value = "";
        loadProductsAdmin();
        
      } catch (error) {
        console.error("❌ Product save error:", error);
        showMessage("productMessage", "❌ Error saving product: " + error.message, false);
      }
    });
  }

  // Add Category
  const addCategoryBtn = byId("addCategoryBtn");
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener("click", async function() {
      const name = safeValue("categoryName").trim();
      if (!name) {
        showMessage("categoryMessage", "❌ Enter category name", false);
        return;
      }

      try {
        await db.collection("categories").add({
          name,
          createdAt: new Date().toISOString()
        });
        if (byId("categoryName")) byId("categoryName").value = "";
        showMessage("categoryMessage", "✅ Category added successfully!");
        loadCategoriesAdmin();
      } catch (error) {
        showMessage("categoryMessage", "❌ Error adding category: " + error.message, false);
        console.error("❌ Category error:", error);
      }
    });
  }

  // Add Slide - WITH IMAGE UPLOAD
  const addSlideBtn = byId("addSlideBtn");
  if (addSlideBtn) {
    addSlideBtn.addEventListener("click", async function() {
      const title = safeValue("slideTitle").trim();
      const text = safeValue("slideText").trim();
      const imageFile = byId("slideImageFile").files[0];
      const imageUrl = safeValue("slideImage").trim();

      if (!title || !text) {
        showMessage("slideMessage", "❌ Title and text are required!", false);
        return;
      }

      if (!imageFile && !imageUrl) {
        showMessage("slideMessage", "❌ Please select an image or provide a URL!", false);
        return;
      }

      try {
        let finalImageUrl = imageUrl;

        // Upload image if file selected
        if (imageFile) {
          showMessage("slideMessage", "⏳ Uploading image...", true);
          const uploadedUrl = await uploadSlideImage(imageFile);
          if (uploadedUrl) {
            finalImageUrl = uploadedUrl;
            console.log("✅ Slide image uploaded:", finalImageUrl);
          } else {
            showMessage("slideMessage", "❌ Failed to upload image", false);
            return;
          }
        }

        await db.collection("slides").add({
          title,
          text,
          image: finalImageUrl,
          createdAt: new Date().toISOString()
        });

        if (byId("slideTitle")) byId("slideTitle").value = "";
        if (byId("slideText")) byId("slideText").value = "";
        if (byId("slideImage")) byId("slideImage").value = "";
        if (byId("slideImageFile")) byId("slideImageFile").value = "";

        showMessage("slideMessage", "✅ Slide added successfully!");
        loadSlidesAdmin();
      } catch (error) {
        showMessage("slideMessage", "❌ Error adding slide: " + error.message, false);
        console.error("❌ Slide error:", error);
      }
    });
  }

  // Add Coupon
  const addCouponBtn = byId("addCouponBtn");
  if (addCouponBtn) {
    addCouponBtn.addEventListener("click", async function() {
      const code = safeValue("couponName").trim();
      const value = Number(safeValue("couponValue", 0));

      if (!code || !value) {
        showMessage("couponMessage", "❌ Enter coupon code and value", false);
        return;
      }

      try {
        await db.collection("coupons").add({
          code: code.toUpperCase(),
          value,
          createdAt: new Date().toISOString()
        });

        if (byId("couponName")) byId("couponName").value = "";
        if (byId("couponValue")) byId("couponValue").value = "";

        showMessage("couponMessage", "✅ Coupon added successfully!");
        loadCouponsAdmin();
      } catch (error) {
        showMessage("couponMessage", "❌ Error adding coupon: " + error.message, false);
        console.error("❌ Coupon error:", error);
      }
    });
  }

  // Save Shipping
  const saveShippingBtn = byId("saveShippingBtn");
  if (saveShippingBtn) {
    saveShippingBtn.addEventListener("click", async function() {
      const state = safeValue("shippingState").trim();
      const price = Number(safeValue("shippingPrice", 0));
      const free = safeChecked("shippingFree");

      if (!state) {
        showMessage("shippingMessage", "❌ Enter state name", false);
        return;
      }

      try {
        await db.collection("shipping").add({
          state,
          price,
          free,
          createdAt: new Date().toISOString()
        });

        if (byId("shippingState")) byId("shippingState").value = "";
        if (byId("shippingPrice")) byId("shippingPrice").value = "";
        if (byId("shippingFree")) byId("shippingFree").checked = false;

        showMessage("shippingMessage", "✅ Shipping rule added successfully!");
        loadShippingAdmin();
      } catch (error) {
        showMessage("shippingMessage", "❌ Error adding shipping rule: " + error.message, false);
        console.error("❌ Shipping error:", error);
      }
    });
  }

  // Save Integration Settings
  const saveIntegrationBtn = byId("saveIntegrationBtn");
  if (saveIntegrationBtn) {
    saveIntegrationBtn.addEventListener("click", function() {
      try {
        localStorage.setItem("firebaseConfigBox", safeValue("firebaseConfigBox"));
        localStorage.setItem("emailjsConfigBox", safeValue("emailjsConfigBox"));
        localStorage.setItem("googleSheetsBox", safeValue("googleSheetsBox"));
        showMessage("settingsMessage", "✅ Integration settings saved!");
      } catch (error) {
        showMessage("settingsMessage", "❌ Error saving settings: " + error.message, false);
        console.error("❌ Settings error:", error);
      }
    });
  }
}

// ============================================
// EXPOSE FUNCTIONS FOR INLINE ONCLICK
// ============================================
window.deleteProduct = deleteProduct;
window.deleteCategory = deleteCategory;
window.deleteSlide = deleteSlide;
window.updateOrderStatus = updateOrderStatus;
window.deleteCoupon = deleteCoupon;
window.deleteShipping = deleteShipping;
window.deleteComment = deleteComment;
window.showMessage = showMessage;
window.formatDate = formatDate;
window.getMonthName = getMonthName;

console.log("✅ Admin.js ready!");