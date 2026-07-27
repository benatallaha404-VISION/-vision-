// =====================================
// PRODUCT.JS - Product details with reviews
// =====================================

console.log("✅ Product.js loaded");

if (typeof firebase !== "undefined" && firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

// ============================================
// LOAD PRODUCT
// ============================================
async function loadProduct() {
  const container = document.getElementById("productDetails");
  if (!container || !productId) {
    container.innerHTML = "<p>Product not found</p>";
    return;
  }

  try {
    const doc = await db.collection("products").doc(productId).get();
    if (!doc.exists) {
      container.innerHTML = "<p>Product not found</p>";
      return;
    }

    const product = doc.data();
    const images = product.images || [];
    const ratingData = await getProductRating(productId);

    container.innerHTML = `
      <div class="product-layout">
        <div class="product-gallery">
          <img id="mainProductImage" class="product-main-image" src="${images[0] || 'assets/images/placeholder.jpg'}" alt="${product.name}" />
          <div class="thumbs">
            ${images.map(img => `<img src="${img}" onclick="changeMainImage('${img}')" />`).join("")}
          </div>
        </div>
        <div class="product-info">
          ${product.isSpecialOffer ? `<span class="badge sale">Special Offer</span>` : ""}
          ${product.isBestSeller ? `<span class="badge best">Best Seller</span>` : ""}
          <h1>${product.name}</h1>
          <div class="product-rating-detail">
            <span class="stars">${getStarRatingHTML(ratingData.average)}</span>
            <span class="rating-text">${ratingData.average.toFixed(1)}</span>
            <span class="rating-count">(${ratingData.count} reviews)</span>
          </div>
          <p class="description">${product.description}</p>
          <div class="price-row">
            ${product.beforeDiscount ? `<span class="old-price">${product.beforeDiscount} DZD</span>` : ""}
            <strong class="current-price">${product.afterDiscount || product.price || 0} DZD</strong>
          </div>
          <div class="details-grid">
            <span><strong>Mode:</strong> ${product.mode === "rent" ? "🔁 Rent" : "🛒 Buy"}</span>
            <span><strong>Stock:</strong> ${product.stock || 0}</span>
            <span><strong>Colors:</strong> ${product.colors || "-"}</span>
            <span><strong>Sizes:</strong> ${product.sizes || "-"}</span>
            <span><strong>Category:</strong> ${product.category || "-"}</span>
          </div>
          <button class="checkout-btn" onclick="addToCartAndCheckout('${productId}')">Add to Cart & Checkout</button>
        </div>
      </div>
    `;

    loadComments();
  } catch (error) {
    console.error("Error loading product:", error);
    container.innerHTML = "<p>Error loading product</p>";
  }
}

function changeMainImage(img) {
  const main = document.getElementById("mainProductImage");
  if (main) main.src = img;
}

function addToCartAndCheckout(productId) {
  window.location.href = `checkout.html?id=${productId}`;
}

// ============================================
// RATING FUNCTIONS
// ============================================
async function getProductRating(productId) {
  try {
    const snap = await db.collection("comments").where("productId", "==", productId).get();
    const comments = [];
    snap.forEach(doc => comments.push(doc.data()));
    if (comments.length === 0) return { average: 0, count: 0 };
    const total = comments.reduce((sum, c) => sum + (c.rating || 0), 0);
    return { average: total / comments.length, count: comments.length };
  } catch (error) {
    console.error("Error getting rating:", error);
    return { average: 0, count: 0 };
  }
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
// COMMENTS
// ============================================
async function loadComments() {
  const section = document.getElementById("commentsSection");
  if (!section) return;

  try {
    const snap = await db.collection("comments")
      .where("productId", "==", productId)
      .orderBy("createdAt", "desc")
      .get();
    
    const comments = [];
    snap.forEach(doc => comments.push({ id: doc.id, ...doc.data() }));
    const ratingData = await getProductRating(productId);

    section.innerHTML = `
      <h2 class="section-title">Customer Reviews</h2>
      <div class="product-rating-detail" style="margin-bottom:20px;">
        <span class="stars" style="font-size:28px;">${getStarRatingHTML(ratingData.average)}</span>
        <span class="rating-text" style="font-size:22px;">${ratingData.average.toFixed(1)}</span>
        <span class="rating-count">(${ratingData.count} reviews)</span>
      </div>
      <div class="comments-grid">
        ${comments.map(c => `
          <div class="comment-card">
            <div class="comment-header">
              <h4>${c.name || 'Anonymous'}</h4>
              <span class="stars">${getStarRatingHTML(c.rating || 0)}</span>
            </div>
            <p class="comment-text">${c.text}</p>
            <p class="comment-date">${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</p>
          </div>
        `).join("")}
        ${comments.length === 0 ? "<p class='small-note'>No reviews yet. Be the first!</p>" : ""}
      </div>
      <div class="rating-input-section">
        <h3>Write a Review</h3>
        <div class="form-group"><label>Your Name</label><input type="text" id="commentName" /></div>
        <div class="form-group">
          <label>Rating</label>
          <div class="star-rating-input">
            <input type="radio" name="rating" id="star5" value="5"><label for="star5">★</label>
            <input type="radio" name="rating" id="star4" value="4"><label for="star4">★</label>
            <input type="radio" name="rating" id="star3" value="3"><label for="star3">★</label>
            <input type="radio" name="rating" id="star2" value="2"><label for="star2">★</label>
            <input type="radio" name="rating" id="star1" value="1"><label for="star1">★</label>
          </div>
        </div>
        <div class="form-group"><label>Your Review</label><textarea id="commentText" rows="3"></textarea></div>
        <button onclick="addComment()" class="save-btn">Submit Review</button>
      </div>
    `;
  } catch (error) {
    console.error("Error loading comments:", error);
  }
}

async function addComment() {
  const name = document.getElementById("commentName").value.trim();
  const text = document.getElementById("commentText").value.trim();
  const ratingInput = document.querySelector('input[name="rating"]:checked');
  const rating = ratingInput ? parseInt(ratingInput.value) : 0;

  if (!name) { alert("Please enter your name"); return; }
  if (!text) { alert("Please write your review"); return; }
  if (!rating) { alert("Please select a rating"); return; }

  try {
    await db.collection("comments").add({
      productId,
      name,
      text,
      rating,
      createdAt: new Date().toISOString()
    });
    document.getElementById("commentName").value = "";
    document.getElementById("commentText").value = "";
    document.querySelectorAll('input[name="rating"]').forEach(i => i.checked = false);
    alert("✅ Review submitted!");
    loadComments();
    loadProduct();
  } catch (error) {
    console.error("Error adding comment:", error);
    alert("❌ Error submitting review");
  }
}

document.addEventListener("DOMContentLoaded", loadProduct);

// Expose
window.changeMainImage = changeMainImage;
window.addComment = addComment;
window.addToCartAndCheckout = addToCartAndCheckout;