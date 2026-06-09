"use strict";

/* ============================================================
   Kalkulator Biaya Shopee
   - Mode "earning": harga jual -> rincian biaya + dana cair + profit
   - Mode "pricing": modal + target -> harga jual disarankan
   ============================================================ */

// Preset tarif (persentase). Default disetel agar cocok dengan contoh user.
const PRESETS = {
  default:  { admin: 8.48, premi: 0.5, service: 4.5, fixed: 0 },
  nonstar:  { admin: 8.0,  premi: 0.5, service: 4.5, fixed: 0 },
  star:     { admin: 7.5,  premi: 0.5, service: 4.0, fixed: 0 },
  starplus: { admin: 5.5,  premi: 0.5, service: 4.0, fixed: 0 },
};

const $ = (id) => document.getElementById(id);

// ---- Util format ----
const rupiah = (n) =>
  "Rp" + Math.round(n).toLocaleString("id-ID");

const parseNum = (str) => {
  if (typeof str !== "string") str = String(str ?? "");
  const digits = str.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
};

const rate = (id) => {
  const v = parseFloat($(id).value);
  return isNaN(v) ? 0 : v / 100;
};

// ---- State ----
let mode = "earning";       // earning | pricing
let targetType = "nominal"; // nominal | markup | margin

// ============================================================
//  Auto-format input ribuan
// ============================================================
function attachThousandFormatter(input) {
  input.addEventListener("input", () => {
    const raw = parseNum(input.value);
    input.value = raw ? raw.toLocaleString("id-ID") : "";
  });
}
["sellPrice", "costPrice", "costPrice2", "targetValue"].forEach((id) => {
  const el = $(id);
  if (el) attachThousandFormatter(el);
});

// ============================================================
//  Kalkulasi inti
// ============================================================
function feeRates() {
  return {
    admin: rate("adminRate"),
    premi: rate("premiRate"),
    service: rate("serviceRate"),
    fixed: parseNum($("fixedFee").value),
  };
}

// Hitung rincian dari harga jual
function computeFromPrice(price, qty) {
  const r = feeRates();
  const totalRate = r.admin + r.premi + r.service;

  const admin = price * r.admin;
  const premi = price * r.premi;
  const service = price * r.service;
  const fixed = r.fixed;

  const feesTotal = admin + premi + service + fixed;
  const net = price - feesTotal;

  return {
    price,
    qty,
    admin,
    premi,
    service,
    fixed,
    feesTotal,
    net,
    totalRate,
  };
}

// Hitung harga jual yang dibutuhkan agar dana cair - modal = target profit
function computePrice(cost, type, target) {
  const r = feeRates();
  const totalRate = r.admin + r.premi + r.service; // fraksi
  const k = 1 - totalRate; // proporsi yang diterima dari harga

  let price = 0;

  if (type === "nominal") {
    // net - cost = target ; net = price*k - fixed
    // price*k - fixed - cost = target
    price = (cost + target + r.fixed) / k;
  } else if (type === "markup") {
    // profit = markup% * cost
    const profit = cost * (target / 100);
    price = (cost + profit + r.fixed) / k;
  } else if (type === "margin") {
    // margin dihitung terhadap harga jual: profit = margin% * price
    // price*k - fixed - cost = (margin/100)*price
    const m = target / 100;
    const denom = k - m;
    price = denom > 0 ? (cost + r.fixed) / denom : NaN;
  }

  return price;
}

// ============================================================
//  Render hasil
// ============================================================
function renderEarning() {
  const price = parseNum($("sellPrice").value);
  const cost = parseNum($("costPrice").value);
  const qty = Math.max(1, parseNum($("qty").value) || 1);

  if (price <= 0) {
    alert("Masukkan harga jual terlebih dahulu.");
    return;
  }

  const c = computeFromPrice(price, qty);

  $("rSubtotal").textContent = rupiah(c.price * qty);
  $("rProduct").textContent = rupiah(c.price * qty);
  $("rAdmin").textContent = "-" + rupiah(c.admin * qty);
  $("rPremi").textContent = "-" + rupiah(c.premi * qty);
  $("rService").textContent = "-" + rupiah(c.service * qty);
  $("rFeesTotal").textContent = "-" + rupiah(c.feesTotal * qty);
  $("rNet").textContent = rupiah(c.net * qty);

  toggleFixedRow(c.fixed, qty);

  // Profit
  if (cost > 0) {
    const totalCost = cost * qty;
    const profit = c.net * qty - totalCost;
    const margin = c.net > 0 ? (profit / (c.net * qty)) * 100 : 0;
    $("rCost").textContent = rupiah(totalCost);
    $("rProfit").textContent = rupiah(profit);
    $("rMargin").textContent = margin.toFixed(1) + "%";
    paintProfit("rProfit", profit >= 0);
    $("profitPanel").hidden = false;
  } else {
    $("profitPanel").hidden = true;
  }

  $("priceHighlight").hidden = true;
  $("resultTitle").textContent = "Rincian Penghasilan";
  showResult();
}

function renderPricing() {
  const cost = parseNum($("costPrice2").value);
  const target = parseNum($("targetValue").value);

  if (cost <= 0) {
    alert("Masukkan modal / HPP terlebih dahulu.");
    return;
  }

  const price = computePrice(cost, targetType, target);

  if (!isFinite(price) || price <= 0) {
    alert("Target margin terlalu tinggi dibanding total biaya. Turunkan target margin.");
    return;
  }

  // Bulatkan ke atas ke ratusan terdekat agar profit tidak meleset turun
  const rounded = Math.ceil(price / 100) * 100;
  const c = computeFromPrice(rounded, 1);
  const profit = c.net - cost;
  const margin = c.net > 0 ? (profit / c.net) * 100 : 0;

  $("suggestedPrice").textContent = rupiah(rounded);
  $("priceHighlight").hidden = false;

  $("rSubtotal").textContent = rupiah(c.price);
  $("rProduct").textContent = rupiah(c.price);
  $("rAdmin").textContent = "-" + rupiah(c.admin);
  $("rPremi").textContent = "-" + rupiah(c.premi);
  $("rService").textContent = "-" + rupiah(c.service);
  $("rFeesTotal").textContent = "-" + rupiah(c.feesTotal);
  $("rNet").textContent = rupiah(c.net);

  toggleFixedRow(c.fixed, 1);

  $("rCost").textContent = rupiah(cost);
  $("rProfit").textContent = rupiah(profit);
  $("rMargin").textContent = margin.toFixed(1) + "%";
  paintProfit("rProfit", profit >= 0);
  $("profitPanel").hidden = false;

  $("resultTitle").textContent = "Simulasi Harga Jual";
  showResult();
}

function toggleFixedRow(fixed, qty) {
  if (fixed > 0) {
    $("rowFixed").hidden = false;
    $("rFixed").textContent = "-" + rupiah(fixed * qty);
  } else {
    $("rowFixed").hidden = true;
  }
}

function paintProfit(id, good) {
  const item = $(id).closest(".profit-item");
  item.classList.toggle("good", good);
  item.classList.toggle("bad", !good);
}

function showResult() {
  $("emptyState").hidden = true;
  $("resultContent").hidden = false;
}

// ============================================================
//  Event wiring
// ============================================================
function setMode(next) {
  mode = next;
  const isEarning = mode === "earning";
  $("tabEarning").classList.toggle("is-active", isEarning);
  $("tabPricing").classList.toggle("is-active", !isEarning);
  $("tabEarning").setAttribute("aria-selected", String(isEarning));
  $("tabPricing").setAttribute("aria-selected", String(!isEarning));
  $("earningInputs").hidden = !isEarning;
  $("pricingInputs").hidden = isEarning;
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

document.querySelectorAll(".seg-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    targetType = btn.dataset.target;
    const labels = {
      nominal: "Target profit (Rp)",
      markup: "Markup terhadap modal (%)",
      margin: "Margin terhadap harga jual (%)",
    };
    const placeholders = { nominal: "contoh: 10.000", markup: "contoh: 30", margin: "contoh: 25" };
    $("targetLabel").textContent = labels[targetType];
    const tv = $("targetValue");
    tv.placeholder = placeholders[targetType];
    tv.value = "";
  });
});

$("settingsToggle").addEventListener("click", () => {
  const panel = $("settingsPanel");
  panel.hidden = !panel.hidden;
  $("settingsToggle").setAttribute("aria-expanded", String(!panel.hidden));
});

$("presetSelect").addEventListener("change", (e) => {
  const p = PRESETS[e.target.value];
  if (!p) return; // custom: biarkan nilai sekarang
  $("adminRate").value = p.admin;
  $("premiRate").value = p.premi;
  $("serviceRate").value = p.service;
  $("fixedFee").value = p.fixed;
});

// Jika user mengubah rate manual, set preset ke custom
["adminRate", "premiRate", "serviceRate", "fixedFee"].forEach((id) => {
  $(id).addEventListener("input", () => {
    $("presetSelect").value = "custom";
  });
});

$("calcBtn").addEventListener("click", () => {
  if (mode === "earning") renderEarning();
  else renderPricing();
});

// Enter untuk hitung
document.querySelectorAll('input[type="text"]').forEach((inp) => {
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("calcBtn").click();
  });
});
