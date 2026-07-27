// =====================================
// CHECKOUT.JS - Order processing
// =====================================

console.log("✅ Checkout.js loaded");

if (typeof firebase !== "undefined" && firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const statesList = [
  "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra",
  "Béchar", "Blida", "Bouira", "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret",
  "Tizi Ouzou", "Algiers", "Djelfa", "Jijel", "Sétif", "Saïda", "Skikda",
  "Sidi Bel Abbès", "Annaba", "Guelma", "Constantine", "Médéa", "Mostaganem",
  "M'Sila", "Mascara", "Ouargla", "Oran", "El Bayadh", "Illizi", "Bordj Bou Arréridj",
  "Boumerdès", "El Tarf", "Tindouf", "Tissemsilt", "El Oued", "Khenchela",
  "Souk Ahras", "Tipaza", "Mila", "Aïn Defla", "Naâma", "Aïn Témouchent",
  "Ghardaïa", "Relizane", "Timimoun", "Bordj Badji Mokhtar", "Ouled Djellal",
  "Béni Abbès", "In Salah", "In Guezzam", "Touggourt", "Djanet", "El M'Ghair",
  "El Menia"
];

function getCartItems() {
  try {
    return JSON.parse(localStorage.getItem('cart')) || [];
  } catch (error) {
    return [];
  }
}

function cartTotal(cart) {
  return cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
}

async function loadCheckoutProduct() {
  const info = document.getElementById("checkoutProductInfo");
  const stateSelect = document.getElementById("state");
  
  if (stateSelect) {
    stateSelect.innerHTML = `<option value="">Select state</option>` + 
      statesList.map(s => `<option value="${s}">${s}</option>`).join("");
  }

  if (!info) return;

  // Mode 1: single product "Buy Now" flow, opened as checkout.html?id=PRODUCT_ID
  if (productId) {
    try {
      const doc = await db.collection("products").doc(productId).get();
      if (!doc.exists) { info.innerHTML = "<p>Product not found</p>"; return; }
      const product = doc.data();
      info.innerHTML = `
        <div class="card">
          <h3>${product.name}</h3>
          <p>${product.description}</p>
          <p><strong>Price:</strong> ${product.afterDiscount || product.price || 0} DZD</p>
          <p><strong>Mode:</strong> ${product.mode === "rent" ? "Rent" : "Buy"}</p>
        </div>
      `;
    } catch (error) {
      console.error("Error loading checkout product:", error);
    }
    return;
  }

  // Mode 2: full cart checkout, opened via "Proceed to Checkout" in the cart sidebar
  const cart = getCartItems();
  if (!cart.length) {
    info.innerHTML = `<p>Your cart is empty. <a href="index.html">Go back to the store</a></p>`;
    return;
  }
  const subtotal = cartTotal(cart);
  info.innerHTML = `
    <div class="card">
      <h3>Order Summary</h3>
      ${cart.map(item => `
        <p style="display:flex;justify-content:space-between;">
          <span>${item.name} × ${item.quantity}</span>
          <strong>${item.price * item.quantity} DZD</strong>
        </p>
      `).join("")}
      <hr style="margin:10px 0;" />
      <p style="display:flex;justify-content:space-between;"><strong>Subtotal</strong><strong>${subtotal} DZD</strong></p>
    </div>
  `;
}

async function getShippingPrice(state) {
  try {
    const snap = await db.collection("shipping").where("state", "==", state).get();
    if (snap.empty) return 0;
    const shipping = snap.docs[0].data();
    return shipping.free ? 0 : Number(shipping.price || 0);
  } catch (error) { return 0; }
}

async function applyCoupon(code, total) {
  try {
    const snap = await db.collection("coupons").where("code", "==", code.toUpperCase()).get();
    if (snap.empty) return { discount: 0, finalTotal: total };
    const coupon = snap.docs[0].data();
    const discount = Number(coupon.value || 0);
    return { discount, finalTotal: Math.max(total - discount, 0) };
  } catch (error) { return { discount: 0, finalTotal: total }; }
}

document.getElementById("checkoutForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const btn = this.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = "⏳ Sending...";

  try {
    const state = document.getElementById("state").value;
    if (!state) { alert("Please select a state"); btn.disabled = false; btn.textContent = "Confirm Order"; return; }

    let basePrice, productName, orderItems = null, cartToClear = null;

    if (productId) {
      // Mode 1: single product "Buy Now" flow (unchanged behavior)
      const productDoc = await db.collection("products").doc(productId).get();
      if (!productDoc.exists) { btn.disabled = false; btn.textContent = "Confirm Order"; return; }
      const product = productDoc.data();
      basePrice = Number(product.afterDiscount || product.price || 0);
      productName = product.name;
    } else {
      // Mode 2: full cart checkout
      const cart = getCartItems();
      if (!cart.length) {
        alert("Your cart is empty");
        btn.disabled = false; btn.textContent = "Confirm Order";
        return;
      }
      basePrice = cartTotal(cart);
      productName = cart.map(i => `${i.name} x${i.quantity}`).join(', ');
      orderItems = cart.map(i => ({ productId: i.id, productName: i.name, price: i.price, quantity: i.quantity }));
      cartToClear = true;
    }

    const shippingPrice = await getShippingPrice(state);
    const couponCode = document.getElementById("couponCode").value.trim();
    const couponResult = couponCode ? await applyCoupon(couponCode, basePrice + shippingPrice) : { discount: 0, finalTotal: basePrice + shippingPrice };
    const now = new Date();

    const orderData = {
      productId: productId || '',
      productName,
      ...(orderItems ? { items: orderItems } : {}),
      fullName: document.getElementById("fullName").value,
      phone: document.getElementById("phone").value,
      email: document.getElementById("email").value || '',
      orderType: document.getElementById("orderType").value,
      state,
      deliveryMethod: document.getElementById("deliveryMethod").value,
      address: document.getElementById("address").value,
      note: document.getElementById("note").value || '',
      paymentMethod: document.getElementById("paymentMethod").value,
      transactionNumber: document.getElementById("transactionNumber").value || '',
      couponCode: couponCode || '',
      shippingPrice,
      discount: couponResult.discount,
      total: couponResult.finalTotal,
      status: "pending",
      createdAt: now.toISOString(),
      orderDate: now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    // Save to Firebase
    await db.collection("orders").add(orderData);
    console.log("✅ Saved to Firebase");

    // Send to Google Sheets
    try {
      if (googleSheetsUrl) {
        await fetch(googleSheetsUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(orderData)
        });
        // Note: mode:"no-cors" always returns an opaque response (status 0),
        // so we can never confirm success/failure here even if the request goes through.
        // If data still doesn't show up in the sheet, test the Apps Script URL
        // directly in a browser tab and re-check its deployment settings.
        console.log("✅ Sent to Google Sheets (no-cors — response can't be verified client-side)");
      }
    } catch (error) { console.error("❌ Google Sheets error:", error); }

    // Send via EmailJS
    try {
      if (typeof emailjs !== "undefined") {
        emailjs.init(emailjsConfig.publicKey);
        await emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateId, {
          fullName: orderData.fullName,
          phone: orderData.phone,
          email: orderData.email,
          productName: orderData.productName,
          total: orderData.total,
          state: orderData.state,
          address: orderData.address,
          orderType: orderData.orderType,
          paymentMethod: orderData.paymentMethod,
          transactionNumber: orderData.transactionNumber,
          couponCode: orderData.couponCode,
          note: orderData.note,
          status: orderData.status,
          orderDate: orderData.orderDate
        });
        console.log("✅ Email sent");
      }
    } catch (error) { console.error("❌ EmailJS error:", error); }

    document.getElementById("checkoutResult").innerHTML = `
      <div class="card" style="background:#eaf8ef;border:2px solid #28a745;padding:20px;border-radius:16px;">
        <h3 style="color:#28a745;">✅ Order sent successfully!</h3>
        <p><strong>Date:</strong> ${orderData.orderDate}</p>
        <p><strong>Total:</strong> ${orderData.total} DZD</p>
        <p><strong>Status:</strong> Pending</p>
        <a href="index.html"><button style="margin-top:10px;background:var(--accent-color);color:white;border:none;padding:10px 20px;border-radius:10px;cursor:pointer;">Back to Store</button></a>
      </div>
    `;

    this.reset();
    document.getElementById("checkoutProductInfo").innerHTML = '';

    if (cartToClear) {
      localStorage.removeItem('cart');
    }

  } catch (error) {
    console.error("❌ Error:", error);
    document.getElementById("checkoutResult").innerHTML = `
      <div class="card" style="background:#ffecec;border:2px solid #dc3545;padding:20px;border-radius:16px;">
        <p style="color:#dc3545;">❌ Failed to send order. Please try again.</p>
      </div>
    `;
  }

  btn.disabled = false;
  btn.textContent = "Confirm Order";
});

document.addEventListener("DOMContentLoaded", loadCheckoutProduct);