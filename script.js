"use strict";

/* ============================================================
   Shopee Fee Calculator — 3 Mode
   1. Harga Jual Aman  (safePrice)
   2. Dana Cair        (netCash)
   3. Target Profit    (targetProfit)
   ============================================================ */

const PRESETS = {
  default:  { admin: 8.48, premi: 0.5, service: 4.5, fixed: 0 },
  nonstar:  { admin: 8.0,  premi: 0.5, service: 4.5, fixed: 0 },
  star:     { admin: 7.5,  premi: 0.5, service: 4.0, fixed: 0 },
  starplus: { admin: 5.5,  premi: 0.5, service: 4.0, fixed: 0 },
};

const $ = (id) => document.getElementById(id);
const rupiah = (n) => "Rp" + Math.round(n).toLocaleString("id-ID");
const parseNum = (str) => {
  if (!str) return 0;
  const d = String(str).replace(/[^\d]/g, "");
  return d ? parseInt(d, 10) : 0;
};
const pct = (id) => {
  const v = parseFloat($(id).value);
  return isNaN(v) ? 0 : v / 100;
};

let mode = "safePrice";

// Format ribuan otomatis untuk input rupiah
function attachFormat(el) {
  if (!el) return;
  el.addEventListener("input", () => {
    const raw = parseNum(el.value);
    el.value = raw ? raw.toLocaleString("id-ID") : "";
  });
}
["spCost", "ncPrice", "ncCost", "tpCost", "tpProfit"].forEach((id) => attachFormat($(id)));

// ============================================================
//  Core — Fees & Breakdown
// ============================================================
function getFees() {
  return {
    admin: pct("adminRate"),
    premi: pct("premiRate"),
    service: pct("serviceRate"),
    fixed: parseNum($("fixedFee").value),
  };
}

function totalRate() {
  const f = getFees();
  return f.admin + f.premi + f.service;
}

function breakdown(price) {
  const f = getFees();
  const admin = price * f.admin;
  const premi = price * f.premi;
  const service = price * f.service;
  const total = admin + premi + service + f.fixed;
  const net = price - total;
  return { price, admin, premi, service, fixed: f.fixed, total, net };
}

// ============================================================
//  Render Helpers
// ============================================================
function showResult() {
  $("emptyState").hidden = true;
  $("emptyState").style.display = "none";
  $("resultContent").hidden = false;
  $("resultContent").style.display = "block";
  setTimeout(() => {
    $("resultHero").scrollIntoView({ behavior: "smooth", block: "start" });
  }, 50);
}

function resetResult() {
  $("emptyState").hidden = false;
  $("emptyState").style.display = "";
  $("resultContent").hidden = true;
  $("resultContent").style.display = "none";
}

function fillBreakdown(b) {
  $("rSubtotal").textContent = rupiah(b.price);
  $("rProduct").textContent = rupiah(b.price);
  $("rAdmin").textContent = "-" + rupiah(b.admin);
  $("rPremi").textContent = "-" + rupiah(b.premi);
  $("rService").textContent = "-" + rupiah(b.service);
  $("rFeesTotal").textContent = "-" + rupiah(b.total);
  $("rNet").textContent = rupiah(b.net);
  if (b.fixed > 0) {
    $("rowFixed").hidden = false;
    $("rFixed").textContent = "-" + rupiah(b.fixed);
  } else {
    $("rowFixed").hidden = true;
  }
}

function fillProfit(netAmount, costAmount) {
  if (costAmount <= 0) { $("profitPanel").hidden = true; return; }
  const profit = netAmount - costAmount;
  const margin = netAmount > 0 ? (profit / netAmount) * 100 : 0;
  $("rCost").textContent = rupiah(costAmount);
  $("rProfit").textContent = rupiah(profit);
  $("rMargin").textContent = margin.toFixed(1) + "%";
  const cell = $("profitCell");
  cell.classList.toggle("good", profit >= 0);
  cell.classList.toggle("bad", profit < 0);
  $("profitPanel").hidden = false;
}

// ============================================================
//  Mode 1: Harga Jual Aman
//  Input: Modal + Margin% → Harga jual
//  Formula: Harga = (Modal + Modal×Margin%) / (1 - totalRate)
// ============================================================
function renderSafePrice() {
  const cost = parseNum($("spCost").value);
  const marginInput = parseFloat($("spMargin").value);
  if (cost <= 0) { alert("Masukkan harga modal."); return; }
  if (isNaN(marginInput) || marginInput < 0) { alert("Masukkan margin keuntungan (%)."); return; }

  const f = getFees();
  const rate = f.admin + f.premi + f.service;
  // Margin = profit / dana_cair → dana_cair = modal / (1 - margin%)
  const targetNet = cost / (1 - marginInput / 100);
  const rawPrice = (targetNet + f.fixed) / (1 - rate);

  if (!isFinite(rawPrice) || rawPrice <= 0) {
    alert("Tidak bisa dihitung. Total biaya ≥ 100%. Cek pengaturan biaya.");
    return;
  }

  const rounded = Math.ceil(rawPrice / 100) * 100;
  const b = breakdown(rounded);
  const actualProfit = b.net - cost;
  const actualMargin = b.net > 0 ? (actualProfit / b.net) * 100 : 0;

  const hero = $("resultHero");
  hero.className = "result-hero safe-price";
  $("rhLabel").textContent = "Harga Jual Aman";
  $("rhValue").textContent = rupiah(rounded);
  $("rhNote").textContent = `Dana cair: ${rupiah(b.net)} — Untung: ${rupiah(actualProfit)} (${actualMargin.toFixed(1)}%)`;

  fillBreakdown(b);
  fillProfit(b.net, cost);
  showResult();
}

// ============================================================
//  Mode 2: Dana Cair (Reverse)
//  Input: Harga Jual → Dana cair
//  Formula: Net = Harga × (1 - totalRate) - fixedFee
// ============================================================
function renderNetCash() {
  const price = parseNum($("ncPrice").value);
  if (price <= 0) { alert("Masukkan harga jual."); return; }

  const cost = parseNum($("ncCost").value);
  const b = breakdown(price);

  const hero = $("resultHero");
  hero.className = "result-hero net-cash";
  $("rhLabel").textContent = "Estimasi Dana Cair";
  $("rhValue").textContent = rupiah(b.net);

  if (cost > 0) {
    const profit = b.net - cost;
    $("rhNote").textContent = `Dari harga ${rupiah(price)} — Untung: ${rupiah(profit)}`;
  } else {
    $("rhNote").textContent = `Dari harga jual ${rupiah(price)}`;
  }

  fillBreakdown(b);
  fillProfit(b.net, cost);
  showResult();
}

// ============================================================
//  Mode 3: Target Profit
//  Input: Modal + Target Profit Rp → Harga jual
//  Formula: Harga = (Modal + TargetProfit + fixedFee) / (1 - totalRate)
// ============================================================
function renderTargetProfit() {
  const cost = parseNum($("tpCost").value);
  const target = parseNum($("tpProfit").value);
  if (cost <= 0) { alert("Masukkan harga modal."); return; }
  if (target <= 0) { alert("Masukkan target profit."); return; }

  const f = getFees();
  const rate = f.admin + f.premi + f.service;
  const rawPrice = (cost + target + f.fixed) / (1 - rate);

  if (!isFinite(rawPrice) || rawPrice <= 0) {
    alert("Tidak bisa dihitung. Total biaya ≥ 100%. Cek pengaturan biaya.");
    return;
  }

  const rounded = Math.ceil(rawPrice / 100) * 100;
  const b = breakdown(rounded);
  const actualProfit = b.net - cost;
  const actualMargin = b.net > 0 ? (actualProfit / b.net) * 100 : 0;

  const hero = $("resultHero");
  hero.className = "result-hero target-profit";
  $("rhLabel").textContent = "Harga Jual untuk Target Profit";
  $("rhValue").textContent = rupiah(rounded);
  $("rhNote").textContent = `Dana cair: ${rupiah(b.net)} — Untung aktual: ${rupiah(actualProfit)} (${actualMargin.toFixed(1)}%)`;

  fillBreakdown(b);
  fillProfit(b.net, cost);
  showResult();
}

// ============================================================
//  Events
// ============================================================
const PANELS = {
  safePrice: "safePricePanel",
  netCash: "netCashPanel",
  targetProfit: "targetProfitPanel",
};

function setMode(m) {
  mode = m;
  document.querySelectorAll(".calc-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.mode === m);
  });
  Object.entries(PANELS).forEach(([key, id]) => {
    $(id).hidden = key !== m;
  });
  resetResult();
}

document.querySelectorAll(".calc-tab").forEach((t) =>
  t.addEventListener("click", () => setMode(t.dataset.mode))
);

$("presetSelect").addEventListener("change", (e) => {
  const p = PRESETS[e.target.value];
  if (!p) return;
  $("adminRate").value = p.admin;
  $("premiRate").value = p.premi;
  $("serviceRate").value = p.service;
  $("fixedFee").value = p.fixed;
});

["adminRate", "premiRate", "serviceRate", "fixedFee"].forEach((id) => {
  $(id).addEventListener("input", () => { $("presetSelect").value = "custom"; });
});

$("calcBtn").addEventListener("click", () => {
  if (mode === "safePrice") renderSafePrice();
  else if (mode === "netCash") renderNetCash();
  else if (mode === "targetProfit") renderTargetProfit();
});

document.querySelectorAll('input[type="text"]').forEach((inp) => {
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") $("calcBtn").click(); });
});
