// =====================================
// PRODUCT.JS
// Product details page
// =====================================

if (typeof firebase !== "undefined" && firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

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

    container.innerHTML = `
      <div class="product-layout">
        <div>
          <img id="mainProductImage" class="product-main-image" src="${images[0] || 'assets/images/placeholder.jpg'}" alt="${product.name}" />
          <div class="thumbs">
            ${images.map(img => `<img src="${img}" alt="${product.name}" onclick="changeMainImage('${img}')">`).join("")}
          </div>
        </div>

        <div class="card">
          ${product.isSpecialOffer ? `<span class="badge sale">Special Offer</span>` : ""}
          ${product.isBestSeller ? `<span class="badge best">Best Seller</span>` : ""}
          <h1>${product.name || ''}</h1>
          <p>${product.description || ''}</p>

          <div class="price-row">
            ${product.beforeDiscount ? `<span class="old-price">${product.beforeDiscount} DZD</span>` : ""}
            <strong style="font-size:24px;color:var(--accent-color);">${product.afterDiscount || product.price || 0} DZD</strong>
          </div>

          <p><strong>Mode:</strong> ${product.mode === "rent" ? "🔁 Rent" : "🛒 Buy"}</p>
          <p><strong>Stock:</strong> ${product.stock || 0}</p>
          <p><strong>Colors:</strong> ${product.colors || "-"}</p>
          <p><strong>Sizes:</strong> ${product.sizes || "-"}</p>
          <p><strong>Category:</strong> ${product.category || "-"}</p>

          <a href="checkout.html?id=${productId}">
            <button style="width:100%;margin-top:10px;background:var(--accent-color);">Proceed to checkout</button>
          </a>
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
  const mainImage = document.getElementById("mainProductImage");
  if (mainImage) mainImage.src = img;
}

async function loadComments() {
  const commentsSection = document.getElementById("commentsSection");
  if (!commentsSection) return;

  try {
    const snap = await db.collection("comments").where("productId", "==", productId).orderBy("createdAt", "desc").get();
    const comments = [];
    snap.forEach(doc => comments.push({ id: doc.id, ...doc.data() }));

    commentsSection.innerHTML = `
      <h2 class="section-title">Customer reviews</h2>
      <div class="comments-grid">
        ${comments.map(comment => `
          <div class="card">
            <h4>${comment.name || 'Anonymous'}</h4>
            <p>${comment.text || ''}</p>
            <p class="small-note">${comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ''}</p>
          </div>
        `).join("")}
        ${comments.length === 0 ? "<p class='small-note'>No reviews yet</p>" : ""}
      </div>

      <div class="card" style="margin-top:20px;">
        <h3>Add a review</h3>
        <input type="text" id="commentName" placeholder="Your name" style="margin-bottom:10px;" />
        <textarea id="commentText" placeholder="Your review" style="margin-bottom:10px;"></textarea>
        <button onclick="addComment()" style="background:var(--accent-color);">Send Review</button>
      </div>
    `;
  } catch (error) {
    console.error("Error loading comments:", error);
  }
}

async function addComment() {
  const name = document.getElementById("commentName").value.trim();
  const text = document.getElementById("commentText").value.trim();

  if (!name || !text) {
    alert("Please enter both name and review");
    return;
  }

  try {
    await db.collection("comments").add({
      productId,
      name,
      text,
      createdAt: new Date().toISOString()
    });

    document.getElementById("commentName").value = "";
    document.getElementById("commentText").value = "";
    loadComments();
  } catch (error) {
    console.error("Error adding comment:", error);
    alert("Error adding comment");
  }
}

document.addEventListener("DOMContentLoaded", loadProduct);