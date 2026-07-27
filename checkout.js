// =====================================
// CHECKOUT.JS
// Checkout page logic
// =====================================

if (typeof firebase !== "undefined" && firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const checkoutParams = new URLSearchParams(window.location.search);
const checkoutProductId = checkoutParams.get("id");

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

async function loadCheckoutProduct() {
  const info = document.getElementById("checkoutProductInfo");
  const stateSelect = document.getElementById("state");

  if (stateSelect) {
    stateSelect.innerHTML = `<option value="">Select state</option>` + statesList.map(s => `<option value="${s}">${s}</option>`).join("");
  }

  if (!info || !checkoutProductId) return;

  try {
    const doc = await db.collection("products").doc(checkoutProductId).get();

    if (!doc.exists) {
      info.innerHTML = "<p>Product not found</p>";
      return;
    }

    const product = doc.data();

    info.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <h3>${product.name || ''}</h3>
        <p>${product.description || ''}</p>
        <p><strong>Price:</strong> ${product.afterDiscount || product.price || 0} DZD</p>
        <p><strong>Mode:</strong> ${product.mode === "rent" ? "Rent" : "Buy"}</p>
      </div>
    `;
  } catch (error) {
    console.error("Error loading checkout product:", error);
  }
}

async function getShippingPrice(state) {
  try {
    const snap = await db.collection("shipping").where("state", "==", state).get();
    if (snap.empty) return 0;

    const shipping = snap.docs[0].data();
    if (shipping.free) return 0;

    return Number(shipping.price || 0);
  } catch (error) {
    console.error("Error getting shipping price:", error);
    return 0;
  }
}

async function applyCoupon(code, total) {
  try {
    const snap = await db.collection("coupons").where("code", "==", code.toUpperCase()).get();

    if (snap.empty) return { valid: false, discount: 0, finalTotal: total };

    const coupon = snap.docs[0].data();
    const discount = Number(coupon.value || 0);

    return {
      valid: true,
      discount,
      finalTotal: Math.max(total - discount, 0)
    };
  } catch (error) {
    console.error("Error applying coupon:", error);
    return { valid: false, discount: 0, finalTotal: total };
  }
}

document.getElementById("checkoutForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const submitBtn = this.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "⏳ Sending...";

  try {
    const productDoc = await db.collection("products").doc(checkoutProductId).get();
    if (!productDoc.exists) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm order";
      return;
    }

    const product = productDoc.data();
    const state = document.getElementById("state").value;
    
    if (!state) {
      alert("Please select a state");
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm order";
      return;
    }

    const shippingPrice = await getShippingPrice(state);
    const basePrice = Number(product.afterDiscount || product.price || 0);

    const couponCode = document.getElementById("couponCode").value.trim();
    const couponResult = couponCode
      ? await applyCoupon(couponCode, basePrice + shippingPrice)
      : { discount: 0, finalTotal: basePrice + shippingPrice };

    const now = new Date();
    const orderData = {
      productId: checkoutProductId,
      productName: product.name || '',
      fullName: document.getElementById("fullName").value,
      phone: document.getElementById("phone").value,
      email: document.getElementById("email").value || '',
      orderType: document.getElementById("orderType").value,
      state: state,
      deliveryMethod: document.getElementById("deliveryMethod").value,
      address: document.getElementById("address").value,
      note: document.getElementById("note").value || '',
      paymentMethod: document.getElementById("paymentMethod").value,
      transactionNumber: document.getElementById("transactionNumber").value || '',
      couponCode: couponCode || '',
      shippingPrice: shippingPrice,
      discount: couponResult.discount || 0,
      total: couponResult.finalTotal,
      status: "pending",
      createdAt: now.toISOString(),
      orderDate: now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      orderTimestamp: now.getTime()
    };

    console.log("📦 Order Data:", orderData);

    // 1. Save to Firebase
    await db.collection("orders").add(orderData);
    console.log("✅ Saved to Firebase");

    // 2. Send to Google Sheets
    try {
      if (googleSheetsUrl) {
        const response = await fetch(googleSheetsUrl, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...orderData,
            date: orderData.orderDate,
            timestamp: orderData.createdAt
          })
        });
        console.log("✅ Order sent to Google Sheets");
      }
    } catch (error) {
      console.error("❌ Google Sheets error:", error);
    }

    // 3. Send via EmailJS
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
          orderDate: orderData.orderDate,
          shippingPrice: orderData.shippingPrice,
          discount: orderData.discount
        });
        console.log("✅ Email sent via EmailJS");
      }
    } catch (error) {
      console.error("❌ EmailJS error:", error);
    }

    document.getElementById("checkoutResult").innerHTML = `
      <div class="card" style="background:#eaf8ef;border-color:#12813a;padding:20px;">
        <h3 style="color:#12813a;">✅ Order sent successfully!</h3>
        <p><strong>Date:</strong> ${orderData.orderDate}</p>
        <p><strong>Order total:</strong> ${orderData.total} DZD</p>
        <p><strong>Status:</strong> Pending</p>
        <p style="font-size:14px;color:#666;margin-top:10px;">We will contact you soon.</p>
        <a href="index.html"><button style="margin-top:10px;background:var(--accent-color);">Back to Store</button></a>
      </div>
    `;

    this.reset();
    document.getElementById("checkoutProductInfo").innerHTML = '';

  } catch (error) {
    console.error("❌ Error sending order:", error);
    document.getElementById("checkoutResult").innerHTML = `
      <div class="card" style="background:#ffecec;border-color:#dc3545;padding:20px;">
        <p style="color:#dc3545;">❌ Failed to send order. Please try again.</p>
        <p style="font-size:14px;color:#666;">Error: ${error.message}</p>
      </div>
    `;
  }

  submitBtn.disabled = false;
  submitBtn.textContent = "Confirm order";
});

document.addEventListener("DOMContentLoaded", loadCheckoutProduct);