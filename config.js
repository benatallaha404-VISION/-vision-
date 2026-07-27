// =====================================
// CONFIG.JS
// Global settings and external services
// =====================================

// Local storage key for store settings
const STORE_SETTINGS_KEY = "store_settings";

// Default store settings
const defaultStoreSettings = {
  storeName: "My Store",
  nickname: "best shop online",
  brandIdentity: "modern",
  currency: "DZD",
  primaryColor: "#111111",
  secondaryColor: "#ffffff",
  accentColor: "#ff6b00",
  logoUrl: "assets/images/logo.png",
  footerText: "© 2026 My Store - All rights reserved"
};

// Firebase config
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

// EmailJS config
const emailjsConfig = {
  publicKey: "CKWFEy1mLeWLKlkkC",
  serviceId: "service_y29ncb9",
  templateId: "template_w2nxpda"
};

// Google Sheets Web App URL
const googleSheetsUrl = "https://script.google.com/macros/s/AKfycbzvGFNJiBEzya6sIiEpK2zn7LDeeQpaAmbHXMU-w_TmJANHW6A3TXEK1C73k96VBe_b/exec";

// Load settings from localStorage
function loadStoreSettings() {
  const saved = localStorage.getItem(STORE_SETTINGS_KEY);
  return saved ? JSON.parse(saved) : defaultStoreSettings;
}

// Save settings to localStorage
function saveStoreSettings(settings) {
  localStorage.setItem(STORE_SETTINGS_KEY, JSON.stringify(settings));
}

// Current store settings
let storeSettings = loadStoreSettings();

// Helper function to format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Helper function to get month name
function getMonthName(monthIndex) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[monthIndex];
}