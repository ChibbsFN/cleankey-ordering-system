// Cleankey ordering web app
// - GUI entirely in English (nameEn)
// - PDF uses Finnish product names (nameFi)
// - Order history stored in browser localStorage
// - Admin module with password gate to add products and download products.json
//
// NOTE: Password check is client-side only; good enough for internal use,
// but not strong security for the public internet.

const ADMIN_PASSWORD = "cleankey-admin"; // <- change this to whatever you want
const HISTORY_STORAGE_KEY = "cleankey_order_history_v1";

let products = [];
let filteredProducts = [];
let orderItems = [];
let orderHistory = [];

let searchTerm = "";
let currentCategory = "";

const qs = (sel) => document.querySelector(sel);

function showToast(message, type = "success") {
  const root = document.getElementById("toast-root");
  if (!root) return;

  const el = document.createElement("div");
  el.textContent = message;
  el.style.padding = "0.5rem 0.9rem";
  el.style.borderRadius = "999px";
  el.style.fontSize = "0.8rem";
  el.style.border = "1px solid rgba(148,163,184,0.7)";
  el.style.background =
    type === "error"
      ? "rgba(127,29,29,0.96)"
      : "rgba(22,101,52,0.96)";
  el.style.color = "#e5e7eb";
  el.style.boxShadow = "0 10px 25px rgba(15,23,42,0.7)";
  el.style.marginBottom = "0.4rem";
  el.style.transition = "opacity 0.2s ease";

  root.appendChild(el);

  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => {
      if (el.parentNode === root) {
        root.removeChild(el);
      }
    }, 200);
  }, 2200);
}


// ---- Load products ----
async function loadProducts() {
  try {
    const res = await fetch("products.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    products = data;
    filteredProducts = data;
    populateCategoryFilter();
    renderProductsSelect();
  } catch (err) {
    console.error(err);
    alert(
      "Failed to load products.json. Make sure it is deployed next to index.html and opened via http(s), not file://"
    );
  }
}

// Build category dropdown from data
function populateCategoryFilter() {
  const select = qs("#category-filter");
  const categories = Array.from(
    new Set(products.map((p) => p.category || "").filter(Boolean))
  ).sort();

  select.innerHTML =
    '<option value="">All categories</option>' +
    categories.map((c) => `<option value="${c}">${c}</option>`).join("");
}

// Apply search + category filters
function applyFilters() {
  const term = searchTerm.toLowerCase();
  filteredProducts = products.filter((p) => {
    const inCategory = !currentCategory || p.category === currentCategory;

    if (!term) return inCategory;

    const sku = (p.sku || "").toLowerCase();
    const fi = (p.nameFi || "").toLowerCase();
    const en = (p.nameEn || "").toLowerCase();
    const matchesTerm =
      sku.includes(term) || fi.includes(term) || en.includes(term);

    return inCategory && matchesTerm;
  });

  renderProductsSelect();
}

// ---- Render product select ----
function renderProductsSelect() {
  const select = qs("#product-select");
  const totalEl = qs("#product-count-total");
  const visibleEl = qs("#product-count-visible");

  const total = products.length;
  const visible = filteredProducts.length;

  if (totalEl) totalEl.textContent = String(total);
  if (visibleEl) visibleEl.textContent = String(visible);

  if (!filteredProducts.length) {
    select.innerHTML = `<option value="">No products match search</option>`;
    qs("#product-price").value = "";
    return;
  }

  select.innerHTML = filteredProducts
    .map((p) => {
      const label = p.nameEn || "";
      return `<option
           value="${p.id}"
           data-sku="${p.sku}"
           data-price="${p.price || 0}"
           data-name-fi="${p.nameFi || ""}"
           data-name-en="${p.nameEn || ""}"
        >
          ${p.sku} – ${label}
        </option>`;
    })
    .join("");

  const first = filteredProducts[0];
  qs("#product-price").value = first ? first.price || 0 : "";
}

// ---- Render current order items table ----
function renderOrderItemsTable() {
  const wrapper = qs("#order-items-table-wrapper");
  if (!orderItems.length) {
    wrapper.innerHTML =
      "<p style='font-size:0.8rem;color:#555;'>No products in this order yet.</p>";
    return;
  }
  const rowsHtml = orderItems
    .map((it, idx) => {
      const nameDisplay = it.nameEn || "";
      return `
        <tr>
          <td data-label="#">${idx + 1}</td>
          <td data-label="SKU">${it.sku}</td>
          <td data-label="Product (EN)">${nameDisplay}</td>
          <td data-label="Qty">${it.quantity}</td>
          <td data-label="Unit price">${it.unitPrice.toFixed(2)} €</td>
          <td data-label="Line total">${(it.quantity * it.unitPrice).toFixed(
            2
          )} €</td>
          <td data-label="Actions">
            <button class="secondary" data-index="${idx}">Remove</button>
          </td>
        </tr>
      `;
    })
    .join("");

  const total = orderItems.reduce(
    (sum, it) => sum + it.quantity * it.unitPrice,
    0
  );

  wrapper.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>#</th><th>SKU</th><th>Product (EN)</th>
          <th>Qty</th><th>Unit price</th><th>Line total</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="5" style="text-align:right;font-weight:600;">Total</td>
          <td colspan="2" style="font-weight:600;">${total.toFixed(2)} €</td>
        </tr>
      </tfoot>
    </table>
  `;

  wrapper.querySelectorAll("button[data-index]").forEach((btn) => {
    const idx = Number(btn.dataset.index);
    btn.addEventListener("click", () => {
      orderItems.splice(idx, 1);
      renderOrderItemsTable();
    });
  });
}

// ---- History helpers ----
function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      orderHistory = [];
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      orderHistory = parsed;
    } else {
      orderHistory = [];
    }
  } catch (e) {
    console.error("Failed to load history", e);
    orderHistory = [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(orderHistory));
  } catch (e) {
    console.error("Failed to save history", e);
  }
}

function addOrderToHistory(order) {
  orderHistory.push(order);
  saveHistory();
  renderHistory();
  showToast("Order saved to history ✅");
}

// Render history table
function renderHistory() {
  const wrapper = qs("#history-table-wrapper");
  if (!wrapper) return;

  if (!orderHistory.length) {
    wrapper.innerHTML =
      "<p style='font-size:0.8rem;color:#555;'>No orders in history yet (stored per browser).</p>";
    return;
  }

  const rowsHtml = orderHistory
    .map((o, idx) => {
      const date = new Date(o.timestamp);
      const dateStr = isNaN(date.getTime())
        ? o.timestamp
        : date.toLocaleString();
      const total = o.total != null ? o.total.toFixed(2) : "";
      const itemCount = o.items ? o.items.length : 0;
      return `
        <tr>
          <td data-label="#">${idx + 1}</td>
          <td data-label="Date">${dateStr}</td>
          <td data-label="Customer">${o.customerName || ""}</td>
          <td data-label="Supervisor">${o.supervisorName || ""}</td>
          <td data-label="Items">${itemCount}</td>
          <td data-label="Total">${total ? total + " €" : ""}</td>
          <td data-label="Actions">
            <button class="secondary" data-history-id="${o.id}">PDF</button>
          </td>
        </tr>
      `;
    })
    .join("");

  wrapper.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Date</th>
          <th>Customer</th>
          <th>Supervisor</th>
          <th>Items</th>
          <th>Total</th>
          <th>PDF</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  wrapper.querySelectorAll("button[data-history-id]").forEach((btn) => {
    const id = btn.getAttribute("data-history-id");
    btn.addEventListener("click", () => downloadHistoryOrderPdf(id));
  });
}

function clearHistory() {
  if (!confirm("Clear all order history in this browser?")) return;
  orderHistory = [];
  saveHistory();
  renderHistory();
  showToast("Order history cleared in this browser", "success");
}

// Generate a PDF for a specific history order
function downloadHistoryOrderPdf(id) {
  const order = orderHistory.find((o) => String(o.id) === String(id));
  if (!order) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const timestamp = order.timestamp || new Date().toISOString();
  const date = new Date(timestamp);
  const dateStr = isNaN(date.getTime()) ? timestamp : date.toISOString();

  doc.setFontSize(18);
  doc.text("Cleankey Order (History)", 14, 18);

  doc.setFontSize(10);
  doc.text(`Order time: ${dateStr}`, 14, 26);
  doc.text(`Customer: ${order.customerName || ""}`, 14, 32);
  if (order.supervisorName) {
    doc.text(`Supervisor: ${order.supervisorName}`, 14, 38);
  }
  let startY = 44;
  if (order.note) {
    doc.text("Note:", 14, 44);
    const split = doc.splitTextToSize(order.note, 180);
    doc.text(split, 14, 50);
    startY = 50 + split.length * 4 + 6;
  }

  const head = [["#", "SKU", "Tuotenimike (FI)", "Määrä", "Hinta €", "Yhteensä €"]];
  const body = order.items.map((it, idx) => {
    const productName = it.nameFi || "";
    const lineTotal = it.quantity * it.unitPrice;
    return [
      String(idx + 1),
      it.sku,
      productName,
      String(it.quantity),
      it.unitPrice.toFixed(2),
      lineTotal.toFixed(2),
    ];
  });

  const total = order.total;

  doc.autoTable({
    startY,
    head,
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [27, 58, 87] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 22 },
      2: { cellWidth: 80 },
      3: { cellWidth: 14 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
    },
  });

  const finalY = doc.previousAutoTable.finalY || startY + 10;

  doc.setFontSize(11);
  const totalText = `TOTAL: ${total.toFixed(2)} €`;
  doc.text(
    totalText,
    190 - doc.getTextWidth(totalText),
    finalY + 10
  );

  doc.setFontSize(8);
  doc.text("Generated from Cleankey order history.", 14, finalY + 18);

  const safeCustomer = (order.customerName || "customer").replace(/[^a-z0-9]+/gi, "_");
  const filename = `cleankey-order-history-${safeCustomer}-${timestamp.replace(/[:T.Z-]/g, "")}.pdf`;
  doc.save(filename);
}

// Export whole history as one PDF summary
function exportAllHistoryPdf() {
  if (!orderHistory.length) {
    alert("No orders in history yet.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Cleankey Order History", 14, 18);

  doc.setFontSize(10);
  const now = new Date();
  doc.text(`Exported: ${now.toISOString()}`, 14, 26);
  doc.text(`Number of orders: ${orderHistory.length}`, 14, 32);

  const head = [["#", "Date", "Customer", "Supervisor", "Items", "Total €"]];
  const body = orderHistory.map((o, idx) => {
    const date = new Date(o.timestamp);
    const dateStr = isNaN(date.getTime())
      ? o.timestamp
      : date.toLocaleString();
    const itemCount = o.items ? o.items.length : 0;
    return [
      String(idx + 1),
      dateStr,
      o.customerName || "",
      o.supervisorName || "",
      String(itemCount),
      (o.total != null ? o.total.toFixed(2) : ""),
    ];
  });

  doc.autoTable({
    startY: 40,
    head,
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [27, 58, 87] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 40 },
      2: { cellWidth: 45 },
      3: { cellWidth: 45 },
      4: { cellWidth: 12 },
      5: { cellWidth: 20 },
    },
  });

  const filename = `cleankey-order-history-${now
    .toISOString()
    .replace(/[:T.Z-]/g, "")}.pdf`;
  doc.save(filename);
}

// ---- Admin helpers ----

function unlockAdmin() {
  const input = qs("#admin-password-input");
  const status = qs("#admin-status");
  if (!input) return;
  const value = input.value;
  if (value === ADMIN_PASSWORD) {
    qs("#admin-locked").style.display = "none";
    qs("#admin-content").style.display = "block";
    status.textContent = "Admin unlocked.";
  } else {
    status.textContent = "Incorrect password.";
  }
}

function addProductFromAdmin() {
  const sku = qs("#admin-sku").value.trim();
  const category = qs("#admin-category").value.trim();
  const nameEn = qs("#admin-name-en").value.trim();
  const nameFi = qs("#admin-name-fi").value.trim();
  const priceRaw = qs("#admin-price").value.trim();
  const status = qs("#admin-status");

  if (!sku || !category || !nameEn || !nameFi) {
    status.textContent = "Fill SKU, category, English and Finnish names.";
    return;
  }

  const price = priceRaw ? Number(priceRaw) : 0;

  const maxId = products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0);
  const newId = maxId + 1;

  const newProduct = {
    id: newId,
    sku,
    nameEn,
    nameFi,
    category,
    price
  };

  products.push(newProduct);

  // Re-apply filters and update category list
  populateCategoryFilter();
  applyFilters();

  status.textContent = `Added product ${sku} – ${nameEn}. Don't forget to download products.json.`;

  // Clear form
  qs("#admin-sku").value = "";
  qs("#admin-category").value = "";
  qs("#admin-name-en").value = "";
  qs("#admin-name-fi").value = "";
  qs("#admin-price").value = "0";
}

function downloadProductsJson() {
  const status = qs("#admin-status");
  const blob = new Blob([JSON.stringify(products, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "products.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  status.textContent = "Downloaded products.json. Upload this file to your web host to make changes permanent.";
}

// ---- Event handlers ----

// Search
const searchInput = qs("#product-search");
searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim();
  applyFilters();
});

// Category filter
const categorySelect = qs("#category-filter");
categorySelect.addEventListener("change", () => {
  currentCategory = categorySelect.value;
  applyFilters();
});

// When product changes, update price field from default
const productSelect = qs("#product-select");
productSelect.addEventListener("change", () => {
  const opt = productSelect.selectedOptions[0];
  if (!opt) return;
  const price = Number(opt.dataset.price || 0);
  if (price) {
    qs("#product-price").value = price;
  }
});

// Add item button
const addItemBtn = qs("#add-item-btn");
addItemBtn.addEventListener("click", () => {
  const select = qs("#product-select");
  const qtyInput = qs("#product-qty");
  const priceInput = qs("#product-price");

  const productId = Number(select.value);
  const qty = Number(qtyInput.value || 0);
  let price = Number(priceInput.value || 0);

  if (!productId || qty <= 0) {
    alert("Select a product and quantity.");
    return;
  }

  const opt = select.selectedOptions[0];
  if (!opt) {
    alert("Selected product not found.");
    return;
  }

  const sku = opt.dataset.sku;
  const nameFi = opt.dataset.nameFi || "";
  const nameEn = opt.dataset.nameEn || "";

  if (!price) {
    const p = products.find((p) => p.id === productId);
    if (p) price = Number(p.price || 0);
  }

  orderItems.push({
    productId,
    sku,
    nameFi,
    nameEn,
    quantity: qty,
    unitPrice: price,
  });

  renderOrderItemsTable();
});

// PDF generation + history save for current order
const downloadBtn = qs("#download-pdf-btn");
downloadBtn.addEventListener("click", () => {
  const customerName = qs("#customer-name").value.trim();
  const supervisorName = qs("#supervisor-name").value.trim();
  const note = qs("#order-note").value.trim();

  if (!customerName) {
    alert("Customer name is required.");
    return;
  }
  if (!orderItems.length) {
    alert("Add at least one product to the order.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const now = new Date();
  const iso = now.toISOString().replace(/[-:TZ]/g, "").slice(0, 14);

  doc.setFontSize(18);
  doc.text("Cleankey Order", 14, 18);

  doc.setFontSize(10);
  doc.text(`Order time: ${now.toISOString()}`, 14, 26);
  doc.text(`Customer: ${customerName}`, 14, 32);
  if (supervisorName) doc.text(`Supervisor: ${supervisorName}`, 14, 38);
  let startY = 44;
  if (note) {
    doc.text("Note:", 14, 44);
    const split = doc.splitTextToSize(note, 180);
    doc.text(split, 14, 50);
    startY = 50 + split.length * 4 + 6;
  }

  const head = [["#", "SKU", "Tuotenimike (FI)", "Määrä", "Hinta €", "Yhteensä €"]];
  const body = orderItems.map((it, idx) => {
    const productName = it.nameFi || ""; // Finnish in PDF
    const lineTotal = it.quantity * it.unitPrice;
    return [
      String(idx + 1),
      it.sku,
      productName,
      String(it.quantity),
      it.unitPrice.toFixed(2),
      lineTotal.toFixed(2),
    ];
  });

  const total = orderItems.reduce(
    (sum, it) => sum + it.quantity * it.unitPrice,
    0
  );

  doc.autoTable({
    startY,
    head,
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [27, 58, 87] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 22 },
      2: { cellWidth: 80 },
      3: { cellWidth: 14 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
    },
  });

  const finalY = doc.previousAutoTable.finalY || startY + 10;

  doc.setFontSize(11);
  const totalText = `TOTAL: ${total.toFixed(2)} €`;
  doc.text(
    totalText,
    190 - doc.getTextWidth(totalText),
    finalY + 10
  );

  doc.setFontSize(8);
  doc.text("Generated by Cleankey ordering web tool.", 14, finalY + 18);

  const filename = `cleankey-order-${iso}.pdf`;
  doc.save(filename);

  // Save into history
  const historyEntry = {
    id: Date.now().toString() + "_" + Math.floor(Math.random() * 10000),
    timestamp: now.toISOString(),
    customerName,
    supervisorName,
    note,
    items: orderItems.map((it) => ({ ...it })),
    total,
  };
  addOrderToHistory(historyEntry);

  // Optionally clear current order after saving
  // orderItems = [];
  // renderOrderItemsTable();
});

// Admin events
const adminUnlockBtn = qs("#admin-unlock-btn");
adminUnlockBtn.addEventListener("click", unlockAdmin);

const adminAddProductBtn = qs("#admin-add-product-btn");
adminAddProductBtn.addEventListener("click", addProductFromAdmin);

const adminDownloadBtn = qs("#admin-download-json-btn");
adminDownloadBtn.addEventListener("click", downloadProductsJson);

// History buttons
const historyRefreshBtn = qs("#history-refresh-btn");
historyRefreshBtn.addEventListener("click", () => {
  loadHistory();
  renderHistory();
});

const historyClearBtn = qs("#history-clear-btn");
historyClearBtn.addEventListener("click", clearHistory);

const historyExportAllBtn = qs("#history-export-all-btn");
historyExportAllBtn.addEventListener("click", exportAllHistoryPdf);

// ---- Init ----
loadProducts();
renderOrderItemsTable();
loadHistory();
renderHistory();
