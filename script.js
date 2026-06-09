"use strict";

/* ============================================================
   Shopee Fee Calculator
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

let mode = "earning";
let targetType = "danacair";

// Format ribuan otomatis
function attachFormat(el) {
  if (!el) return;
  el.addEventListener("input", () => {
    const raw = parseNum(el.value);
    el.value = raw ? raw.toLocaleString("id-ID") : "";
  });
}
["sellPrice", "costPrice", "costPrice2", "targetValue"].forEach((id) => attachFormat($(id)));

// ============================================================
//  Core
// ============================================================
function getFees() {
  return {
    admin: pct("adminRate"),
    premi: pct("premiRate"),
    service: pct("serviceRate"),
    fixed: parseNum($("fixedFee").value),
  };
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

function priceFromTarget(type, target, cost) {
  const f = getFees();
  const k = 1 - (f.admin + f.premi + f.service);
  switch (type) {
    case "danacair": return (target + f.fixed) / k;
    case "nominal": return (cost + target + f.fixed) / k;
    case "markup": return (cost + cost * (target / 100) + f.fixed) / k;
    case "margin": {
      const denom = k - target / 100;
      return denom > 0 ? (cost + f.fixed) / denom : NaN;
    }
    default: return NaN;
  }
}

// ============================================================
//  Render
// ============================================================
function showResult() {
  $("emptyState").hidden = true;
  $("resultContent").hidden = false;
}
function resetResult() {
  $("emptyState").hidden = false;
  $("resultContent").hidden = true;
}

function fillBreakdown(b, qty) {
  $("rSubtotal").textContent = rupiah(b.price * qty);
  $("rProduct").textContent = rupiah(b.price * qty);
  $("rAdmin").textContent = "-" + rupiah(b.admin * qty);
  $("rPremi").textContent = "-" + rupiah(b.premi * qty);
  $("rService").textContent = "-" + rupiah(b.service * qty);
  $("rFeesTotal").textContent = "-" + rupiah(b.total * qty);
  $("rNet").textContent = rupiah(b.net * qty);
  if (b.fixed > 0) {
    $("rowFixed").hidden = false;
    $("rFixed").textContent = "-" + rupiah(b.fixed * qty);
  } else {
    $("rowFixed").hidden = true;
  }
}

function fillProfit(netTotal, costTotal) {
  if (costTotal <= 0) { $("profitPanel").hidden = true; return; }
  const profit = netTotal - costTotal;
  const margin = netTotal > 0 ? (profit / netTotal) * 100 : 0;
  $("rCost").textContent = rupiah(costTotal);
  $("rProfit").textContent = rupiah(profit);
  $("rMargin").textContent = margin.toFixed(1) + "%";
  const cell = $("profitCell");
  cell.classList.toggle("good", profit >= 0);
  cell.classList.toggle("bad", profit < 0);
  $("profitPanel").hidden = false;
}

function renderEarning() {
  const price = parseNum($("sellPrice").value);
  if (price <= 0) { alert("Masukkan harga jual."); return; }
  const cost = parseNum($("costPrice").value);
  const qty = Math.max(1, parseNum($("qty").value) || 1);
  const b = breakdown(price);

  const hero = $("resultHero");
  hero.className = "result-hero";
  $("rhLabel").textContent = "Estimasi Dana Cair";
  $("rhValue").textContent = rupiah(b.net * qty);
  $("rhNote").textContent = qty > 1 ? `${qty} pcs \u00d7 ${rupiah(b.net)}/pcs` : `Dari harga jual ${rupiah(price)}`;

  fillBreakdown(b, qty);
  fillProfit(b.net * qty, cost * qty);
  showResult();
}

function renderPricing() {
  const target = parseNum($("targetValue").value);
  const cost = parseNum($("costPrice2").value);
  if (target <= 0) { alert("Masukkan nilai target."); return; }
  if (targetType !== "danacair" && cost <= 0) { alert("Masukkan modal / HPP."); return; }

  const rawPrice = priceFromTarget(targetType, target, cost);
  if (!isFinite(rawPrice) || rawPrice <= 0) { alert("Target terlalu tinggi. Turunkan nilainya."); return; }

  const rounded = Math.ceil(rawPrice / 100) * 100;
  const b = breakdown(rounded);

  const hero = $("resultHero");
  hero.className = "result-hero pricing";
  $("rhLabel").textContent = "Harga Jual Disarankan";
  $("rhValue").textContent = rupiah(rounded);
  $("rhNote").textContent = `Dana cair: ${rupiah(b.net)}`;

  fillBreakdown(b, 1);
  fillProfit(b.net, cost);
  showResult();
}

// ============================================================
//  Events
// ============================================================
function setMode(m) {
  mode = m;
  document.querySelectorAll(".calc-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.mode === m);
  });
  $("earningPanel").hidden = m !== "earning";
  $("pricingPanel").hidden = m !== "pricing";
  resetResult();
}

document.querySelectorAll(".calc-tab").forEach((t) =>
  t.addEventListener("click", () => setMode(t.dataset.mode))
);

document.querySelectorAll(".chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    targetType = btn.dataset.target;
    const isRp = targetType === "danacair" || targetType === "nominal";
    const labels = { danacair: "Target Dana Cair", nominal: "Target Profit", markup: "Markup Terhadap Modal", margin: "Margin Terhadap Harga Jual" };
    const ph = { danacair: "36.048", nominal: "10.000", markup: "30", margin: "25" };
    $("targetLabel").textContent = labels[targetType];
    $("targetPrefix").textContent = isRp ? "Rp" : "%";
    $("targetValue").placeholder = ph[targetType];
    $("targetValue").value = "";
  });
});

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
  mode === "earning" ? renderEarning() : renderPricing();
});

document.querySelectorAll('input[type="text"]').forEach((inp) => {
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") $("calcBtn").click(); });
});
