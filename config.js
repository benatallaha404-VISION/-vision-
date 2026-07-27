// =====================================
// CONFIG.JS - General settings
// =====================================

// Local storage key
const STORE_SETTINGS_KEY = "store_settings";

// Default settings
const defaultStoreSettings = {
  storeName: "My Store",
  nickname: "best shop online",
  brandIdentity: "modern",
  currency: "DZD",
  primaryColor: "#e774b7",
  secondaryColor: "#fce4f4",
  accentColor: "#e774b7",
  textColor: "#1a1a2e",
  logoUrl: "assets/images/logo.png",
  footerText: "© 2025 My Store - All rights reserved",
  cardStyle: "classic" // classic, premium, gold
};

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCp1d6k0K_-7u_kFGbB2TkLkZC-RbjVYcw",
  authDomain: "test-8a022.firebaseapp.com",
  databaseURL: "https://test-8a022-default-rtdb.firebaseio.com",
  projectId: "test-8a022",
  storageBucket: "test-8a022.firebasestorage.app",
  messagingSenderId: "259248448691",
  appId: "1:259248448691:web:99e580448e04b7d8c5bcc6",
  measurementId: "G-K1L594RXJQ"
};

// Cloudinary Config — used to upload product and slider images (free alternative to Firebase Storage)
// 1) Create a free account at https://cloudinary.com
// 2) Copy the "Cloud name" from the Dashboard and put it in place of YOUR_CLOUD_NAME
// 3) Go to Settings → Upload → Upload presets → Add upload preset
//    Set Signing Mode = Unsigned, save, and copy the preset name in place of YOUR_UPLOAD_PRESET
const cloudinaryConfig = {
  cloudName: "y0apmkuz",
  uploadPreset: "mydress"
};

// EmailJS Config
const emailjsConfig = {
  publicKey: "CKWFEy1mLeWLKlkkC",
  serviceId: "service_y29ncb9",
  templateId: "template_w2nxpda"
};

// Google Sheets URL
const googleSheetsUrl = "https://script.google.com/macros/s/AKfycbzvGFNJiBEzya6sIiEpK2zn7LDeeQpaAmbHXMU-w_TmJANHW6A3TXEK1C73k96VBe_b/exec";

// Helper functions
function loadStoreSettings() {
  const saved = localStorage.getItem(STORE_SETTINGS_KEY);
  return saved ? JSON.parse(saved) : defaultStoreSettings;
}

function saveStoreSettings(settings) {
  localStorage.setItem(STORE_SETTINGS_KEY, JSON.stringify(settings));
}

function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getMonthName(monthIndex) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[monthIndex] || '';
}

let storeSettings = loadStoreSettings();