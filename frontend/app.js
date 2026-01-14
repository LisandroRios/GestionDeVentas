const API_BASE = "http://127.0.0.1:8000";

/* ---------- Helpers ---------- */
async function api(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);
  const text = await res.text();

  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!res.ok) {
    const msg = data?.detail ? data.detail : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function show(pre, data) {
  if (!pre) return;
  pre.textContent = JSON.stringify(data, null, 2);
}
function showError(pre, err) {
  if (!pre) return;
  pre.textContent = `Error: ${err}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function fmtMoney(n) {
  const x = Number(n || 0);
  return `$${x.toFixed(2)}`;
}

async function withLoading(btn, label, fn) {
  if (!btn) return fn();
  const prev = btn.textContent;
  btn.disabled = true;
  btn.textContent = label;
  try {
    return await fn();
  } finally {
    btn.disabled = false;
    btn.textContent = prev;
  }
}


/* ---------- Toast ---------- */
const toast = document.getElementById("toast");
let toastTimer = null;

function notify(msg, kind) {
  if (!toast) return;
  toast.classList.remove("hidden", "ok", "err");
  toast.classList.add(kind);
  toast.textContent = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
}
const notifyOk = (m) => notify(m, "ok");
const notifyErr = (m) => notify(m, "err");

/* ---------- State ---------- */
let cashOpen = false;
let settings = { cash_discount_enabled: false, cash_discount_percent: 0 };

let productsAll = [];   // lista completa (con variants)
let productsView = [];  // filtrados por buscador (para Venta)
let cart = [];          // [{variant_id, quantity, label}]

/* ---------- Banner estado ---------- */
const statusCash = document.getElementById("statusCash");
const statusSales = document.getElementById("statusSales");
const statusTotal = document.getElementById("statusTotal");

function setStatusBanner({ total_sales, gross_total } = {}) {
  if (statusCash) statusCash.textContent = cashOpen ? "ABIERTA ✅" : "CERRADA ❌";
  if (statusSales) statusSales.textContent = (total_sales ?? "-").toString();
  if (statusTotal) statusTotal.textContent = gross_total != null ? fmtMoney(gross_total) : "-";
}

/* ---------- Elements ---------- */
/* CAJA */
const outCash = document.getElementById("outputCash");
const btnCashCurrent = document.getElementById("btnCashCurrent");
const btnCashOpen = document.getElementById("btnCashOpen");
const btnCashClose = document.getElementById("btnCashClose");
const openingAmount = document.getElementById("openingAmount");
const openedBy = document.getElementById("openedBy");
const closingAmount = document.getElementById("closingAmount");
const closedBy = document.getElementById("closedBy");

/* VENTA */
const outSale = document.getElementById("outputSale");
const btnLoadProducts = document.getElementById("btnLoadProducts");
const btnReloadSettings = document.getElementById("btnReloadSettings");
const btnSalesToday = document.getElementById("btnSalesToday");

const searchBox = document.getElementById("searchBox");
const productSelect = document.getElementById("productSelect");
const variantSelect = document.getElementById("variantSelect");
const qtyInput = document.getElementById("qty");
const paymentMethod = document.getElementById("paymentMethod");
const btnAddItem = document.getElementById("btnAddItem");
const btnConfirmSale = document.getElementById("btnConfirmSale");
const btnClearCart = document.getElementById("btnClearCart");
const cartDiv = document.getElementById("cart");
const cartTotalEl = document.getElementById("cartTotal");
const cashDiscountRow = document.getElementById("cashDiscountRow");
const cartTotalDiscountedEl = document.getElementById("cartTotalDiscounted");
const discountLabel = document.getElementById("discountLabel");
const receiptDiv = document.getElementById("receipt");

/* DASH */
const outDash = document.getElementById("outputDash");
const btnDashboard = document.getElementById("btnDashboard");
const statSales = document.getElementById("statSales");
const statTotal = document.getElementById("statTotal");
const statDay = document.getElementById("statDay");
const breakdownDiv = document.getElementById("breakdown");
const topItemsDiv = document.getElementById("topItems");

/* STOCK */
const outStock = document.getElementById("outputStock");
const btnLowStock = document.getElementById("btnLowStock");
const lowStockList = document.getElementById("lowStockList");

/* HISTORIAL */
const outSalesToday = document.getElementById("outputSalesToday");
const btnSalesTodayRefresh = document.getElementById("btnSalesTodayRefresh");
const salesTodayList = document.getElementById("salesTodayList");
const salesDay = document.getElementById("salesDay");
const salesPaymentFilter = document.getElementById("salesPaymentFilter");

/* PRODUCTOS (admin) */
const outProducts = document.getElementById("outputProducts");
const btnProductsRefresh = document.getElementById("btnProductsRefresh");
const newProductName = document.getElementById("newProductName");
const newProductCategory = document.getElementById("newProductCategory");
const newProductActive = document.getElementById("newProductActive");
const btnCreateProduct = document.getElementById("btnCreateProduct");

const adminProductSelect = document.getElementById("adminProductSelect");
const newVariantName = document.getElementById("newVariantName");
const newVariantSku = document.getElementById("newVariantSku");
const newVariantPrice = document.getElementById("newVariantPrice");
const newVariantStock = document.getElementById("newVariantStock");
const newVariantStockMin = document.getElementById("newVariantStockMin");
const btnCreateVariant = document.getElementById("btnCreateVariant");

const adminVariantSelect = document.getElementById("adminVariantSelect");
const stockDelta = document.getElementById("stockDelta");
const stockSet = document.getElementById("stockSet");
const btnApplyDelta = document.getElementById("btnApplyDelta");
const btnSetStock = document.getElementById("btnSetStock");
const productsAdminList = document.getElementById("productsAdminList");

// EDIT VARIANT
const editVariantSelect = document.getElementById("editVariantSelect");
const editVariantName = document.getElementById("editVariantName");
const editVariantSku = document.getElementById("editVariantSku");
const editVariantPrice = document.getElementById("editVariantPrice");
const editVariantStockMin = document.getElementById("editVariantStockMin");
const btnUpdateVariant = document.getElementById("btnUpdateVariant");


/* ---------- UI State ---------- */
function updateUIState() {
  if (btnAddItem) btnAddItem.disabled = productsView.length === 0;
  if (btnConfirmSale) btnConfirmSale.disabled = !(cashOpen && cart.length > 0);
}

/* ---------- Settings ---------- */
async function loadSettings() {
  try {
    settings = await api("GET", "/settings/");
  } catch {
    settings = { cash_discount_enabled: false, cash_discount_percent: 0 };
  }
}

/* ---------- Cash ---------- */
async function refreshCashState() {
  try {
    const data = await api("GET", "/cash/current");
    cashOpen = true;
    updateUIState();
    setStatusBanner();
    return data;
  } catch {
    cashOpen = false;
    updateUIState();
    setStatusBanner();
    return null;
  }
}

/* ---------- Products shared (refresh global) ---------- */
async function fetchProducts() {
  // backend: GET /products/
  const data = await api("GET", "/products/");
  productsAll = Array.isArray(data) ? data : [];
  applySearch();
}

/* ---------- Products + Search (Venta) ---------- */
function applySearch() {
  const q = (searchBox?.value || "").trim().toLowerCase();
  if (!q) {
    productsView = productsAll.slice();
    return;
  }

  const filtered = [];
  for (const p of productsAll) {
    const pname = (p.name || "").toLowerCase();
    const cat = (p.category || "").toLowerCase();
    const vars = p.variants || [];

    const matchedVariants = vars.filter(v => {
      const vname = (v.variant_name || "").toLowerCase();
      return pname.includes(q) || cat.includes(q) || vname.includes(q);
    });

    if (pname.includes(q) || cat.includes(q) || matchedVariants.length > 0) {
      filtered.push({ ...p, variants: matchedVariants.length > 0 ? matchedVariants : vars });
    }
  }
  productsView = filtered;
}

function renderProductsSelectForSale() {
  if (!productSelect) return;
  productSelect.innerHTML = "";
  for (const p of productsView) {
    const opt = document.createElement("option");
    opt.value = String(p.id);
    opt.textContent = `${p.name} (${p.category ?? "sin categoría"})`;
    productSelect.appendChild(opt);
  }
}

function renderVariantsSelectForSale() {
  if (!variantSelect) return;
  variantSelect.innerHTML = "";

  const pid = Number(productSelect?.value);
  const p = productsView.find(x => x.id === pid);
  const vars = p?.variants ?? [];

  for (const v of vars) {
    const opt = document.createElement("option");
    opt.value = String(v.id);
    opt.textContent = `${v.variant_name} | $${v.price} | stock: ${v.stock}`;
    variantSelect.appendChild(opt);
  }
}

/* ---------- Products admin render ---------- */
function renderAdminProductSelect() {
  if (!adminProductSelect) return;
  adminProductSelect.innerHTML = "";
  for (const p of productsAll) {
    const opt = document.createElement("option");
    opt.value = String(p.id);
    opt.textContent = `#${p.id} · ${p.name}`;
    adminProductSelect.appendChild(opt);
  }
}

function flattenVariants() {
  // [{variant_id, label, stock, product_id}]
  const out = [];
  for (const p of productsAll) {
    for (const v of (p.variants || [])) {
      out.push({
        product_id: p.id,
        variant_id: v.id,
        label: `${p.name} - ${v.variant_name}`,
        stock: v.stock,
        stock_min: v.stock_min,
        price: v.price
      });
    }
  }
  return out;
}

function renderAdminVariantSelect() {
  if (!adminVariantSelect) return;
  adminVariantSelect.innerHTML = "";

  const vars = flattenVariants();
  if (vars.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No hay variantes cargadas";
    adminVariantSelect.appendChild(opt);
    return;
  }

  for (const it of vars) {
    const opt = document.createElement("option");
    opt.value = String(it.variant_id);
    opt.textContent = `#${it.variant_id} · ${it.label} (stock: ${it.stock})`;
    adminVariantSelect.appendChild(opt);
  }
}

function renderEditVariantSelect() {
  if (!editVariantSelect) return;
  editVariantSelect.innerHTML = "";

  const vars = flattenVariants();
  if (vars.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No hay variantes cargadas";
    editVariantSelect.appendChild(opt);
    return;
  }

  for (const it of vars) {
    const opt = document.createElement("option");
    opt.value = String(it.variant_id);
    opt.textContent = `#${it.variant_id} · ${it.label}`;
    editVariantSelect.appendChild(opt);
  }
}

function fillEditVariantFields(variantId) {
  const v = findVariantById(variantId);
  if (!v) return;

  if (editVariantName) editVariantName.value = v.variant_name ?? "";
  if (editVariantSku) editVariantSku.value = v.sku ?? "";
  if (editVariantPrice) editVariantPrice.value = Number(v.price ?? 0);
  if (editVariantStockMin) editVariantStockMin.value = Number(v.stock_min ?? 0);
}


function renderProductsAdminList() {
  if (!productsAdminList) return;
  productsAdminList.innerHTML = "";

  if (!productsAll.length) {
    productsAdminList.innerHTML = `<div class="itemRow"><small>No hay productos todavía.</small></div>`;
    return;
  }

  for (const p of productsAll) {
    const row = document.createElement("div");
    row.className = "itemRow";
    const varsCount = (p.variants || []).length;
    row.innerHTML = `
      <div>
        <strong>#${p.id} · ${p.name}</strong><br/>
        <small>${p.category ?? "sin categoría"} · variantes: ${varsCount} · ${p.active ? "activo" : "inactivo"}</small>
      </div>
      <div><small class="muted">—</small></div>
    `;
    productsAdminList.appendChild(row);

    for (const v of (p.variants || [])) {
      const vrow = document.createElement("div");
      vrow.className = "itemRow";
      vrow.style.opacity = "0.95";
      vrow.innerHTML = `
        <div>
          <strong>#${v.id} · ${v.variant_name}</strong><br/>
          <small>precio: ${fmtMoney(v.price)} · stock: ${v.stock} · min: ${v.stock_min}</small>
        </div>
        <div><small class="muted">${v.sku ?? ""}</small></div>
      `;
      productsAdminList.appendChild(vrow);
    }
  }
}

function refreshAllProductUIs() {
  // Venta
  applySearch();
  renderProductsSelectForSale();
  renderVariantsSelectForSale();

  // Admin
  renderAdminProductSelect();
  renderAdminVariantSelect();
  renderProductsAdminList();
  renderEditVariantSelect();


  updateUIState();
}

// autocompletar con la primera variante si existe
const first = Number(editVariantSelect?.value);
if (Number.isFinite(first) && first > 0) fillEditVariantFields(first);


/* ---------- Cart totals ---------- */
function findVariantById(variantId) {
  for (const p of productsAll) {
    const v = (p.variants ?? []).find(x => x.id === variantId);
    if (v) return v;
  }
  return null;
}

function calcCartTotal() {
  let total = 0;
  for (const it of cart) {
    const v = findVariantById(it.variant_id);
    const price = v ? Number(v.price) : 0;
    total += price * Number(it.quantity);
  }
  return total;
}

function renderCartTotal() {
  if (!cartTotalEl) return;
  cartTotalEl.textContent = fmtMoney(calcCartTotal());
}

function renderDiscountedTotal() {
  if (!cashDiscountRow || !cartTotalDiscountedEl || !paymentMethod) return;

  const isCash = paymentMethod.value === "CASH";
  const enabled = !!settings.cash_discount_enabled;
  const percent = Number(settings.cash_discount_percent || 0);

  if (!isCash || !enabled || percent <= 0 || cart.length === 0) {
    cashDiscountRow.classList.add("hidden");
    return;
  }

  const base = calcCartTotal();
  const discounted = base * (1 - percent / 100);

  if (discountLabel) discountLabel.textContent = `(${percent}% OFF)`;
  cartTotalDiscountedEl.textContent = fmtMoney(discounted);
  cashDiscountRow.classList.remove("hidden");
}

/* ---------- Cart render ---------- */
function renderCart() {
  if (!cartDiv) return;
  cartDiv.innerHTML = "";

  if (cart.length === 0) {
    cartDiv.innerHTML = `<div class="itemRow"><small>Carrito vacío</small></div>`;
    renderCartTotal();
    renderDiscountedTotal();
    updateUIState();
    return;
  }

  cart.forEach((it, idx) => {
    const row = document.createElement("div");
    row.className = "itemRow";
    row.innerHTML = `
      <div>
        <div><strong>${it.label}</strong></div>
        <small>variant_id=${it.variant_id} · qty=${it.quantity}</small>
      </div>
      <button data-idx="${idx}">Quitar</button>
    `;
    row.querySelector("button").addEventListener("click", () => {
      cart.splice(idx, 1);
      renderCart();
      notifyOk("Ítem quitado");
    });
    cartDiv.appendChild(row);
  });

  renderCartTotal();
  renderDiscountedTotal();
  updateUIState();
}

/* ---------- Receipt ---------- */
function renderReceipt(sale) {
  if (!receiptDiv) return;
  if (!sale) {
    receiptDiv.innerHTML = `<div class="itemRow"><small>Sin venta todavía.</small></div>`;
    return;
  }

  const items = sale.items || [];
  const lines = items.map(it => {
    return `<div class="itemRow" style="justify-content: space-between;">
      <small>variant_id ${it.variant_id} · x${it.quantity}</small>
      <strong>${fmtMoney(it.line_total)}</strong>
    </div>`;
  }).join("");

  const dp = sale.discount_percent ?? null;

  receiptDiv.innerHTML = `
    <div class="itemRow">
      <div>
        <strong>Venta #${sale.id}</strong><br/>
        <small>${sale.payment_method}${dp ? ` · descuento ${dp}%` : ""}</small>
      </div>
      <div><strong>${fmtMoney(sale.total)}</strong></div>
    </div>
    ${lines || `<div class="itemRow"><small>(sin items)</small></div>`}
    <div class="itemRow" style="justify-content: space-between;">
      <small>Subtotal</small><strong>${fmtMoney(sale.subtotal)}</strong>
    </div>
    <div class="itemRow" style="justify-content: space-between;">
      <small>Total</small><strong>${fmtMoney(sale.total)}</strong>
    </div>
  `;
}

/* ---------- Dashboard ---------- */
function renderBreakdown(items) {
  if (!breakdownDiv) return;
  breakdownDiv.innerHTML = "";
  if (!items || items.length === 0) {
    breakdownDiv.innerHTML = `<div class="itemRow"><small>Sin datos</small></div>`;
    return;
  }
  for (const it of items) {
    const row = document.createElement("div");
    row.className = "itemRow";
    row.innerHTML = `
      <div><strong>${it.payment_method}</strong><br/><small>${it.count_sales} ventas</small></div>
      <div><strong>${fmtMoney(it.total)}</strong></div>
    `;
    breakdownDiv.appendChild(row);
  }
}

function renderTopItems(items) {
  if (!topItemsDiv) return;
  topItemsDiv.innerHTML = "";
  if (!items || items.length === 0) {
    topItemsDiv.innerHTML = `<div class="itemRow"><small>Sin datos</small></div>`;
    return;
  }
  for (const it of items) {
    const row = document.createElement("div");
    row.className = "itemRow";
    row.innerHTML = `
      <div>
        <strong>${it.product_name} - ${it.variant_name}</strong><br/>
        <small>qty: ${it.quantity_sold}</small>
      </div>
      <div><strong>${fmtMoney(it.revenue)}</strong></div>
    `;
    topItemsDiv.appendChild(row);
  }
}

async function refreshDashboard() {
  if (!outDash) return null;
  outDash.textContent = "Cargando dashboard...";
  try {
    const data = await api("GET", "/dashboard/today");
    if (statSales) statSales.textContent = String(data.total_sales);
    if (statTotal) statTotal.textContent = fmtMoney(data.gross_total);
    if (statDay) statDay.textContent = data.day;

    renderBreakdown(data.breakdown);
    renderTopItems(data.top_items);
    show(outDash, data);

    setStatusBanner({ total_sales: data.total_sales, gross_total: data.gross_total });

    return data;
  } catch (err) {
    showError(outDash, err.message ?? err);
    return null;
  }
}

/* ---------- Low stock ---------- */
function renderLowStock(items) {
  if (!lowStockList) return;
  lowStockList.innerHTML = "";
  if (!items || items.length === 0) {
    lowStockList.innerHTML = `<div class="itemRow"><small>Todo OK (sin stock bajo)</small></div>`;
    return;
  }
  for (const it of items) {
    const row = document.createElement("div");
    row.className = "itemRow";
    row.innerHTML = `
      <div>
        <strong>${it.product_name} - ${it.variant_name}</strong><br/>
        <small>stock: ${it.stock} · min: ${it.stock_min}</small>
      </div>
      <div><strong>⚠️</strong></div>
    `;
    lowStockList.appendChild(row);
  }
}

async function refreshLowStock() {
  if (!outStock) return null;
  outStock.textContent = "Cargando stock bajo...";
  try {
    const data = await api("GET", "/reports/low-stock");
    renderLowStock(data);
    show(outStock, data);
    return data;
  } catch (err) {
    showError(outStock, err.message ?? err);
    return null;
  }
}

/* ---------- Sales today ---------- */
function renderSalesToday(list) {
  if (!salesTodayList) return;
  salesTodayList.innerHTML = "";
  if (!list || list.length === 0) {
    salesTodayList.innerHTML = `<div class="itemRow"><small>No hay ventas hoy.</small></div>`;
    return;
  }

  for (const s of list) {
    const dt = s.created_at ? new Date(s.created_at) : null;
    const hhmm = dt ? dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";

    const row = document.createElement("div");
    row.className = "itemRow";
    row.innerHTML = `
      <div>
        <strong>Venta #${s.id}</strong><br/>
        <small>${hhmm} · ${s.payment_method}</small>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <strong>${fmtMoney(s.total)}</strong>
        <button data-id="${s.id}">Ver</button>
      </div>
    `;

    row.querySelector("button").addEventListener("click", async () => {
      try {
        const detail = await api("GET", `/sales/${s.id}`);
        renderReceipt(detail);
        notifyOk(`Detalle venta #${s.id}`);
        location.hash = "#venta";
      } catch (e) {
        notifyErr(e.message ?? "No pude traer la venta");
      }
    });

    salesTodayList.appendChild(row);
  }
}

async function refreshSalesToday() {
  if (!outSalesToday) return null;
  outSalesToday.textContent = "Cargando ventas...";

  try {
    const day = salesDay?.value || todayISO();
    const pm = (salesPaymentFilter?.value || "").trim();

    let url = `/sales/?day=${encodeURIComponent(day)}`;
    if (pm) url += `&payment_method=${encodeURIComponent(pm)}`;

    const data = await api("GET", url);
    renderSalesToday(data);
    show(outSalesToday, { day, payment_method: pm || "ALL", count: data.length });
    return data;
  } catch (err) {
    showError(outSalesToday, err.message ?? err);
    return null;
  }
}


/* ---------- PRODUCTOS: acciones ---------- */
async function refreshProductsAdmin() {
  if (outProducts) outProducts.textContent = "Refrescando productos...";
  try {
    await fetchProducts();
    refreshAllProductUIs();
    show(outProducts, { count: productsAll.length });
    notifyOk("Productos actualizados ✅");
  } catch (e) {
    showError(outProducts, e.message ?? e);
    notifyErr(e.message ?? "Error refrescando productos");
  }
}

async function createProductFromUI() {
  if (outProducts) outProducts.textContent = "Creando producto...";
  try {
    const name = (newProductName?.value || "").trim();
    const category = (newProductCategory?.value || "").trim();
    const active = (newProductActive?.value ?? "true") === "true";

    if (!name) throw new Error("Nombre de producto requerido");

    const payload = { name, category: category || null, active };
    const created = await api("POST", "/products/", payload);

    notifyOk("Producto creado ✅");
    show(outProducts, created);

    if (newProductName) newProductName.value = "";
    if (newProductCategory) newProductCategory.value = "";

    await refreshProductsAdmin();
    document.getElementById("productos")?.scrollIntoView({ behavior: "smooth" });
  } catch (e) {
    showError(outProducts, e.message ?? e);
    notifyErr(e.message ?? "No pude crear producto");
  }
}

async function createVariantFromUI() {
  if (outProducts) outProducts.textContent = "Creando variante...";
  try {
    const productId = Number(adminProductSelect?.value);
    if (!Number.isFinite(productId) || productId <= 0) throw new Error("Seleccioná un producto válido");

    const vname = (newVariantName?.value || "").trim();
    if (!vname) throw new Error("Nombre de variante requerido");

    const sku = (newVariantSku?.value || "").trim() || null;

    const price = Number(newVariantPrice?.value);
    const stock = Number(newVariantStock?.value);
    const stock_min = Number(newVariantStockMin?.value);

    if (!Number.isFinite(price) || price < 0) throw new Error("Precio inválido");
    if (!Number.isFinite(stock) || stock < 0) throw new Error("Stock inválido");
    if (!Number.isFinite(stock_min) || stock_min < 0) throw new Error("Stock mínimo inválido");

    const payload = { variant_name: vname, sku, price, stock, stock_min };

    const created = await api("POST", `/products/${productId}/variants`, payload);

    notifyOk("Variante creada ✅");
    show(outProducts, created);

    if (newVariantName) newVariantName.value = "";
    if (newVariantSku) newVariantSku.value = "";
    if (newVariantPrice) newVariantPrice.value = "";
    if (newVariantStock) newVariantStock.value = "";
    if (newVariantStockMin) newVariantStockMin.value = "";

    await refreshProductsAdmin();
  } catch (e) {
    showError(outProducts, e.message ?? e);
    notifyErr(e.message ?? "No pude crear variante");
  }
}

async function applyStockDeltaFromUI() {
  if (outProducts) outProducts.textContent = "Aplicando delta...";
  try {
    const variantId = Number(adminVariantSelect?.value);
    if (!Number.isFinite(variantId) || variantId <= 0) throw new Error("Seleccioná una variante válida");

    const delta = Number(stockDelta?.value);
    if (!Number.isFinite(delta) || delta === 0) throw new Error("Delta inválido (ej: 5 o -2)");

    const current = findVariantById(variantId);
    if (!current) throw new Error("No pude encontrar la variante en memoria (refrescá productos)");

    const nextStock = Number(current.stock) + delta;
    if (nextStock < 0) throw new Error("El stock no puede quedar negativo");

    const payload = { stock: nextStock };
    const updated = await api("PATCH", `/products/variants/${variantId}`, payload);

    notifyOk("Stock actualizado ✅");
    show(outProducts, { variantId, before: current.stock, after: updated.stock });

    if (stockDelta) stockDelta.value = "";
    await refreshProductsAdmin();
  } catch (e) {
    showError(outProducts, e.message ?? e);
    notifyErr(e.message ?? "No pude ajustar stock");
  }
}

async function setStockFromUI() {
  if (outProducts) outProducts.textContent = "Seteando stock...";
  try {
    const variantId = Number(adminVariantSelect?.value);
    if (!Number.isFinite(variantId) || variantId <= 0) throw new Error("Seleccioná una variante válida");

    const stock = Number(stockSet?.value);
    if (!Number.isFinite(stock) || stock < 0) throw new Error("Stock inválido");

    const payload = { stock };
    const updated = await api("PATCH", `/products/variants/${variantId}`, payload);

    notifyOk("Stock seteado ✅");
    show(outProducts, updated);

    if (stockSet) stockSet.value = "";
    await refreshProductsAdmin();
  } catch (e) {
    showError(outProducts, e.message ?? e);
    notifyErr(e.message ?? "No pude setear stock");
  }
}

/* ---------- Events ---------- */
/* Caja */
btnCashCurrent?.addEventListener("click", async () => {
  outCash.textContent = "Consultando caja actual...";
  const data = await refreshCashState();
  if (!data) {
    outCash.textContent = "No hay caja abierta. Abrí caja para empezar.";
    notifyErr("No hay caja abierta");
    return;
  }
  show(outCash, data);
  notifyOk("Caja abierta ✅");
  await refreshDashboard();
});

btnCashOpen?.addEventListener("click", async () => {
  outCash.textContent = "Abriendo caja...";
  try {
    const payload = {
      opening_amount: Number(openingAmount.value || 0),
      opened_by: openedBy.value?.trim() || null,
    };
    const data = await api("POST", "/cash/open", payload);
    cashOpen = true;
    show(outCash, data);
    notifyOk("Caja abierta ✅");
  } catch (err) {
    showError(outCash, err.message ?? err);
    notifyErr(err.message ?? String(err));
  } finally {
    await refreshCashState();
    await refreshDashboard();
  }
});

btnCashClose?.addEventListener("click", async () => {
  if (!confirm("¿Seguro que querés CERRAR la caja?")) return;

  await withLoading(btnCashClose, "Cerrando...", async () => {
    outCash.textContent = "Cerrando caja...";
    try {
      const payload = {
        closing_amount: Number(closingAmount.value || 0),
        closed_by: closedBy.value?.trim() || null,
      };
      const data = await api("POST", "/cash/close", payload);
      cashOpen = false;
      show(outCash, data);
      notifyOk("Caja cerrada ✅");
    } catch (err) {
      showError(outCash, err.message ?? err);
      notifyErr(err.message ?? String(err));
    } finally {
      await refreshCashState();
      await refreshDashboard();
    }
  });
});

/* Venta */
btnLoadProducts?.addEventListener("click", async () => {
  outSale.textContent = "Cargando productos...";
  try {
    await fetchProducts();
    refreshAllProductUIs();
    outSale.textContent = `Productos cargados: ${productsAll.length} ✅`;
    notifyOk("Productos cargados ✅");
  } catch (err) {
    showError(outSale, err.message ?? err);
    notifyErr(err.message ?? String(err));
  } finally {
    updateUIState();
  }
});

btnReloadSettings?.addEventListener("click", async () => {
  try {
    await loadSettings();
    renderDiscountedTotal();
    notifyOk(`Settings recargados ✅ (cash: ${settings.cash_discount_percent || 0}%)`);
  } catch {
    notifyErr("No pude recargar settings");
  }
});

searchBox?.addEventListener("input", () => {
  applySearch();
  renderProductsSelectForSale();
  renderVariantsSelectForSale();
  updateUIState();
});

productSelect?.addEventListener("change", () => renderVariantsSelectForSale());
paymentMethod?.addEventListener("change", () => renderDiscountedTotal());

btnAddItem?.addEventListener("click", async () => {
  await refreshCashState();
  if (!cashOpen) {
    outSale.textContent = "No podés vender sin caja abierta. Abrí caja primero.";
    notifyErr("Abrí caja antes de vender");
    return;
  }

  const pid = Number(productSelect.value);
  const p = productsView.find(x => x.id === pid);
  if (!p) return;

  const vid = Number(variantSelect.value);
  const v = (p.variants ?? []).find(x => x.id === vid);
  if (!v) return;

  const q = Number(qtyInput.value || 1);
  if (!Number.isFinite(q) || q <= 0) {
    outSale.textContent = "Cantidad inválida.";
    notifyErr("Cantidad inválida");
    return;
  }

  const existing = cart.find(x => x.variant_id === vid);
  if (existing) existing.quantity += q;
  else cart.push({ variant_id: vid, quantity: q, label: `${p.name} - ${v.variant_name}` });

  renderCart();
  outSale.textContent = "Ítem agregado al carrito ✅";
  notifyOk("Ítem agregado ✅");
});

btnClearCart?.addEventListener("click", () => {
  cart = [];
  renderCart();
  outSale.textContent = "Carrito vaciado ✅";
  notifyOk("Carrito vaciado");
});

btnConfirmSale?.addEventListener("click", async () => {
  if (!confirm("¿Confirmar venta?")) return;

  await withLoading(btnConfirmSale, "Registrando...", async () => {
    outSale.textContent = "Registrando venta...";
    try {
      await refreshCashState();
      if (!cashOpen) throw new Error("No hay caja abierta. Abrí caja antes de vender.");
      if (cart.length === 0) throw new Error("Carrito vacío.");

      const payload = {
        payment_method: paymentMethod.value,
        items: cart.map(x => ({ variant_id: x.variant_id, quantity: x.quantity })),
      };

      const sale = await api("POST", "/sales/", payload);
      renderReceipt(sale);
      show(outSale, sale);
      notifyOk("Venta registrada ✅");

      await fetchProducts();
      refreshAllProductUIs();

      cart = [];
      renderCart();

      await refreshDashboard();
      await refreshLowStock();
      await refreshSalesToday();
    } catch (err) {
      showError(outSale, err.message ?? err);
      notifyErr(err.message ?? String(err));
    } finally {
      updateUIState();
    }
  });
});


/* Dashboard + Stock */
btnDashboard?.addEventListener("click", async () => {
  await refreshDashboard();
  notifyOk("Dashboard actualizado");
});
btnLowStock?.addEventListener("click", async () => {
  await refreshLowStock();
  notifyOk("Stock bajo actualizado");
});

/* Ventas hoy */
btnSalesToday?.addEventListener("click", async () => {
  await refreshSalesToday();
  notifyOk("Ventas de hoy actualizadas");
  document.getElementById("historial")?.scrollIntoView({ behavior: "smooth" });
  location.hash = "#historial";
});
btnSalesTodayRefresh?.addEventListener("click", async () => {
  await refreshSalesToday();
  notifyOk("Ventas de hoy actualizadas");
});

/* PRODUCTOS */
btnProductsRefresh?.addEventListener("click", async () => {
  await refreshProductsAdmin();
});

btnCreateProduct?.addEventListener("click", async () => {
  await createProductFromUI();
});

btnCreateVariant?.addEventListener("click", async () => {
  await createVariantFromUI();
});

btnApplyDelta?.addEventListener("click", async () => {
  await applyStockDeltaFromUI();
});

btnSetStock?.addEventListener("click", async () => {
  await setStockFromUI();
});

editVariantSelect?.addEventListener("change", () => {
  const id = Number(editVariantSelect.value);
  if (Number.isFinite(id) && id > 0) fillEditVariantFields(id);
});

btnUpdateVariant?.addEventListener("click", async () => {
  try {
    const variantId = Number(editVariantSelect?.value);
    if (!Number.isFinite(variantId) || variantId <= 0) throw new Error("Elegí una variante válida");

    const payload = {
      variant_name: editVariantName?.value?.trim() || null,
      sku: editVariantSku?.value?.trim() || null,
      price: Number(editVariantPrice?.value),
      stock_min: Number(editVariantStockMin?.value),
    };

    if (!Number.isFinite(payload.price) || payload.price < 0) throw new Error("Precio inválido");
    if (!Number.isFinite(payload.stock_min) || payload.stock_min < 0) throw new Error("Stock mínimo inválido");

    const updated = await api("PATCH", `/products/variants/${variantId}`, payload);

    notifyOk("Variante actualizada ✅");
    show(outProducts, updated);

    await fetchProducts();
    refreshAllProductUIs();
  } catch (e) {
    notifyErr(e.message ?? "No pude actualizar variante");
    showError(outProducts, e.message ?? e);
  }
});



/* ---------- Active section highlight (menu) ---------- */
const navLinks = Array.from(document.querySelectorAll(".nav a"));
const sections = ["caja", "venta", "dashboard", "stock", "historial", "productos"]
  .map(id => document.getElementById(id))
  .filter(Boolean);

function setActive(id) {
  navLinks.forEach(a => {
    const target = a.getAttribute("href")?.replace("#", "");
    a.classList.toggle("active", target === id);
  });
}

const observer = new IntersectionObserver((entries) => {
  const visible = entries
    .filter(e => e.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (visible?.target?.id) setActive(visible.target.id);
}, { threshold: [0.2, 0.4, 0.6] });

sections.forEach(sec => observer.observe(sec));
if (location.hash) setActive(location.hash.replace("#", ""));
else if (sections[0]) setActive(sections[0].id);

/* ---------- init ---------- */
async function safeRun(label, fn) {
  try {
    return await fn();
  } catch (e) {
    console.error(`[${label}]`, e);
    notifyErr(`${label}: ${e?.message ?? e}`);
    return null;
  }
}

/* ---------- init (robusto) ---------- */
(async () => {
  renderCart();
  renderReceipt(null);

  await safeRun("Settings", async () => loadSettings());
  await safeRun("Cash state", async () => refreshCashState());

  // cada cosa por separado para que no “mate” toda la app si falla una
  await safeRun("Dashboard", async () => refreshDashboard());
  await safeRun("Low stock", async () => refreshLowStock());
  await safeRun("Sales today", async () => refreshSalesToday());

  await safeRun("Products", async () => {
    await fetchProducts();
    refreshAllProductUIs();
  });

  updateUIState();
  renderDiscountedTotal();
})();
